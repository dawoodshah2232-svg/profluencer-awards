<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailCampaign;
use App\Services\AuditLogger;
use App\Services\CampaignAudience;
use App\Services\CampaignSender;
use App\Services\MailSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Email campaigns: create a draft (template + audience), send it in
 * batches, and see per-recipient delivery and opens.
 */
class CampaignController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => EmailCampaign::query()->with('template:id,name')->latest()->get(),
            'audiences' => CampaignAudience::AUDIENCES,
        ]);
    }

    public function show(Request $request, EmailCampaign $campaign): JsonResponse
    {
        CampaignSender::refreshCounts($campaign);
        $recipients = $campaign->recipients()
            ->when($request->filled('status'), function ($q) use ($request) {
                return $request->input('status') === 'opened' ? $q->whereNotNull('opened_at') : $q->where('status', $request->input('status'));
            })
            ->when($request->filled('search'), fn ($q) => $q->where('email', 'like', '%'.$request->input('search').'%'))
            ->orderBy('id')
            ->paginate(100, ['id', 'email', 'name', 'status', 'error', 'sent_at', 'opened_at', 'open_count']);

        return response()->json(['data' => $campaign->fresh()->load('template:id,name'), 'recipients' => $recipients]);
    }

    public function store(Request $request): JsonResponse
    {
        $campaign = EmailCampaign::create($this->validated($request) + ['created_by' => $request->user()->id, 'status' => 'draft']);
        AuditLogger::log('admin', $request->user(), 'campaign.created', $campaign);

        return response()->json(['data' => $campaign], 201);
    }

    public function update(Request $request, EmailCampaign $campaign): JsonResponse
    {
        abort_if($campaign->status !== 'draft', 422, 'Only draft campaigns can be edited.');
        $campaign->update($this->validated($request));

        return response()->json(['data' => $campaign->fresh()]);
    }

    public function destroy(Request $request, EmailCampaign $campaign): JsonResponse
    {
        abort_if($campaign->status === 'sending', 422, 'This campaign is sending. Let it finish first.');
        AuditLogger::log('admin', $request->user(), 'campaign.deleted', $campaign, ['name' => $campaign->name]);
        $campaign->delete();

        return response()->json(['message' => 'Campaign deleted.']);
    }

    /** How many unique recipients an audience resolves to (before sending). */
    public function audienceCount(Request $request): JsonResponse
    {
        $request->validate(['audience' => ['required', Rule::in(array_keys(CampaignAudience::AUDIENCES))]]);
        $rows = CampaignAudience::resolve($request->input('audience'), ['category_id' => $request->input('category_id')], $request->input('custom_emails'));

        return response()->json(['data' => ['count' => count($rows), 'sample' => array_slice(array_keys($rows), 0, 5)]]);
    }

    /** Freezes the recipient list and sends the first batch. */
    public function send(Request $request, EmailCampaign $campaign): JsonResponse
    {
        abort_if($campaign->status === 'sent', 422, 'This campaign was already sent. Duplicate it to send again.');
        abort_if($campaign->template_id === null, 422, 'Choose a template first.');

        MailSettings::apply();
        if ($campaign->status === 'draft') {
            CampaignSender::start($campaign);
            AuditLogger::log('admin', $request->user(), 'campaign.started', $campaign, ['recipients' => $campaign->total]);
        }

        abort_if($campaign->fresh()->total === 0, 422, 'This audience has no recipients.');

        return $this->process($campaign);
    }

    /** Sends the next batch; the admin page calls this until pending = 0. */
    public function process(EmailCampaign $campaign): JsonResponse
    {
        abort_if(! in_array($campaign->status, ['sending', 'sent'], true), 422, 'Start the campaign first.');
        @set_time_limit(120);
        MailSettings::apply();
        $result = CampaignSender::process($campaign, 20);

        return response()->json(['data' => $campaign->fresh()] + $result);
    }

    /** Copies a campaign back to a new draft (e.g. to resend to a new audience). */
    public function duplicate(Request $request, EmailCampaign $campaign): JsonResponse
    {
        $copy = EmailCampaign::create([
            'name' => $campaign->name.' (copy)', 'template_id' => $campaign->template_id, 'subject' => $campaign->subject,
            'audience' => $campaign->audience, 'audience_filter' => $campaign->audience_filter, 'custom_emails' => $campaign->custom_emails,
            'status' => 'draft', 'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $copy], 201);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'template_id' => ['required', 'integer', 'exists:email_templates,id'],
            'subject' => ['nullable', 'string', 'max:255'],
            'audience' => ['required', Rule::in(array_keys(CampaignAudience::AUDIENCES))],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'custom_emails' => ['nullable', 'string', 'max:100000', 'required_if:audience,custom'],
        ]);
        $validated['audience_filter'] = ['category_id' => $validated['category_id'] ?? null];
        unset($validated['category_id']);

        return $validated;
    }
}
