<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\TemplateMail;
use App\Models\EmailTemplate;
use App\Rules\NoLineBreaks;
use App\Services\AuditLogger;
use App\Services\EmailRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Email templates: list, create, edit, delete (campaign templates only),
 * live preview and test send.
 */
class EmailTemplateController extends Controller
{
    /** Sample values used for previews and test sends. */
    private const SAMPLE = [
        'name' => 'Sara Ahmed', 'email' => 'sara@example.com', 'category' => 'Fashion and Beauty',
        'code' => '482913', 'nominee_name' => 'Amira Khan', 'notes' => 'Please add the public link to your Instagram profile.',
    ];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => EmailTemplate::query()->orderBy('category')->orderBy('name')->get(),
            'variables' => EmailRenderer::VARIABLES,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $template = EmailTemplate::create($this->validated($request) + ['category' => 'campaign']);
        AuditLogger::log('admin', $request->user(), 'email_template.created', $template);

        return response()->json(['data' => $template], 201);
    }

    public function update(Request $request, EmailTemplate $template): JsonResponse
    {
        $template->update($this->validated($request));
        AuditLogger::log('admin', $request->user(), 'email_template.updated', $template);

        return response()->json(['data' => $template->fresh()]);
    }

    public function destroy(Request $request, EmailTemplate $template): JsonResponse
    {
        if ($template->isSystem()) {
            return response()->json(['message' => 'System templates are used by the website and cannot be deleted. Edit them instead.'], 422);
        }

        AuditLogger::log('admin', $request->user(), 'email_template.deleted', $template, ['name' => $template->name]);
        $template->delete();

        return response()->json(['message' => 'Template deleted.']);
    }

    /** Renders unsaved editor fields (or a saved template) with sample data. */
    public function preview(Request $request): JsonResponse
    {
        $template = $request->filled('id') ? EmailTemplate::query()->findOrFail($request->integer('id')) : new EmailTemplate($this->validated($request, false));
        $out = EmailRenderer::render($template, self::SAMPLE + ['voting_link' => EmailRenderer::globals()['site_url'].'/#/nominee/1', 'reset_url' => EmailRenderer::globals()['site_url'].'/#/reset-password'], $request->input('subject_override'), $request->boolean('campaign') ? 'preview' : null);

        return response()->json(['data' => $out]);
    }

    public function test(Request $request, EmailTemplate $template): JsonResponse
    {
        $validated = $request->validate(['to' => ['required', new NoLineBreaks, 'email', 'max:190']]);

        try {
            $out = EmailRenderer::render($template, ['email' => $validated['to']] + self::SAMPLE);
            Mail::to($validated['to'])->send(new TemplateMail('[Test] '.$out['subject'], $out['html'], $out['text']));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Sending failed: '.mb_substr($e->getMessage(), 0, 300), 'code' => 'MAIL_FAILED'], 422);
        }

        return response()->json(['message' => "Test sent to {$validated['to']}."]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $strict = true): array
    {
        return $request->validate([
            'name' => [$strict ? 'required' : 'nullable', 'string', 'max:150'],
            'subject' => [$strict ? 'required' : 'nullable', new NoLineBreaks, 'string', 'max:255'],
            'preheader' => ['nullable', 'string', 'max:255'],
            'hero_eyebrow' => ['nullable', 'string', 'max:120'],
            'hero_title' => ['nullable', 'string', 'max:255'],
            'hero_subtitle' => ['nullable', 'string', 'max:2000'],
            'hero_image_url' => ['nullable', 'string', 'max:255'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'cta_url' => ['nullable', 'string', 'max:255'],
            'body_html' => ['nullable', 'string', 'max:100000'],
            'footer_note' => ['nullable', 'string', 'max:2000'],
        ]);
    }
}
