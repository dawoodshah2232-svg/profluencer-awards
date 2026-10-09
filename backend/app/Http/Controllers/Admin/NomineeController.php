<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\NomineeResource;
use App\Models\Nominee;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin CRUD for shortlisted nominees.
 */
class NomineeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Nominee::query()->with(['category', 'influencerAccount.user'])->orderBy('category_id')->orderBy('name');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $search)->orWhere('handle', 'like', $search));
        }

        $request->attributes->set('expose_votes', true);

        return NomineeResource::collection($query->paginate(min(500, max(1, $request->integer('per_page', 50)))))->response();
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'bio' => ['nullable', 'string', 'max:5000'],
            'photo_url' => ['nullable', 'string', 'max:255'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'profile_url' => ['nullable', 'url', 'max:255'],
            'followers' => ['nullable', 'string', 'max:40'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected,changes_requested'],
        ]);

        $nominee = Nominee::create($validated);
        AuditLogger::log('admin', $request->user(), 'nominee.created', $nominee);

        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee)], 201);
    }

    public function show(Request $request, Nominee $nominee): JsonResponse
    {
        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee->load('category'))]);
    }

    public function update(Request $request, Nominee $nominee): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'bio' => ['nullable', 'string', 'max:5000'],
            'photo_url' => ['nullable', 'string', 'max:255'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'profile_url' => ['nullable', 'url', 'max:255'],
            'followers' => ['nullable', 'string', 'max:40'],
            'status' => ['sometimes', 'string', 'in:pending,approved,rejected,changes_requested'],
        ]);

        $nominee->update($validated);
        AuditLogger::log('admin', $request->user(), 'nominee.updated', $nominee, ['changes' => $validated]);

        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee->fresh())]);
    }

    /** Verification checklist a reviewer completes before approving a nomination. */
    public const CHECKS = ['profile_link', 'identity', 'audience', 'category_fit', 'no_duplicate'];

    /**
     * Genuine-or-fake review of a nomination. Approval requires every check
     * to be confirmed; the checklist, notes, reviewer and time are stored on
     * the nominee and audit-logged. Only approved nominees are public and
     * can receive votes.
     */
    public function review(Request $request, Nominee $nominee): JsonResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected,changes_requested,pending'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'checks' => ['nullable', 'array'],
            'checks.*' => ['boolean'],
        ]);

        $checks = [];
        foreach (self::CHECKS as $key) {
            $checks[$key] = (bool) ($validated['checks'][$key] ?? false);
        }

        if ($validated['decision'] === Nominee::STATUS_APPROVED && in_array(false, $checks, true)) {
            return response()->json([
                'message' => 'Complete every verification check before approving.',
                'code' => 'VERIFICATION_INCOMPLETE',
            ], 422);
        }

        $nominee->update([
            'status' => $validated['decision'],
            'review_notes' => $validated['notes'] ?? null,
            'verification' => $checks + ['reviewer' => $request->user()->name],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        AuditLogger::log('admin', $request->user(), 'nominee.reviewed', $nominee, [
            'decision' => $validated['decision'],
            'checks_passed' => count(array_filter($checks)).'/'.count($checks),
        ]);

        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee->fresh()->load(['category', 'influencerAccount.user']))]);
    }

    public function destroy(Request $request, Nominee $nominee): JsonResponse
    {
        if ($nominee->votes()->exists()) {
            return response()->json([
                'message' => 'This nominee has votes and cannot be deleted. Reject it instead.',
                'code' => 'NOMINEE_HAS_VOTES',
            ], 409);
        }

        AuditLogger::log('admin', $request->user(), 'nominee.deleted', $nominee);
        $nominee->delete();

        return response()->json(['message' => 'Nominee deleted.']);
    }
}
