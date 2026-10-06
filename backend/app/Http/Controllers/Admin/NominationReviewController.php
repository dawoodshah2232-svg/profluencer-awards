<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\NominationResource;
use App\Models\Nomination;
use App\Models\Nominee;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Review queue for public nomination submissions.
 * Approving a nomination promotes it to a nominee row.
 */
class NominationReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Nomination::query()->with('category')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        return NominationResource::collection($query->paginate(50))->response();
    }

    public function show(Nomination $nomination): JsonResponse
    {
        return response()->json(['data' => new NominationResource($nomination->load('category'))]);
    }

    /**
     * Compatibility update for the CRM: {status, review_notes}.
     * Maps onto the review() decision flow.
     */
    public function update(Request $request, Nomination $nomination): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected,changes_requested'],
            'review_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $request->merge(['decision' => $validated['status']]);

        if (! empty($validated['review_notes'])) {
            $nomination->forceFill(['review_notes' => $validated['review_notes']])->save();
        }

        return $this->review($request, $nomination->fresh());
    }

    /**
     * Removing a nomination from the queue rejects it (audit-kept).
     */
    public function destroy(Request $request, Nomination $nomination): JsonResponse
    {
        $request->merge(['decision' => Nomination::STATUS_REJECTED]);

        return $this->review($request, $nomination);
    }

    public function review(Request $request, Nomination $nomination): JsonResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:approved,rejected,changes_requested'],
        ]);

        $nominee = DB::transaction(function () use ($nomination, $validated, $request): ?Nominee {
            $nomination->update(['status' => $validated['decision']]);

            $created = null;
            if ($validated['decision'] === Nomination::STATUS_APPROVED && $nomination->category_id) {
                $created = Nominee::create([
                    'category_id' => $nomination->category_id,
                    'name' => $nomination->nominee_name,
                    'handle' => $nomination->handle,
                    'platform' => $nomination->platform,
                    'bio' => $nomination->reason,
                    'status' => Nominee::STATUS_APPROVED,
                ]);
            }

            AuditLogger::log('admin', $request->user(), 'nomination.reviewed', $nomination, [
                'decision' => $validated['decision'],
                'nominee_id' => $created?->id,
            ]);

            return $created;
        });

        return response()->json([
            'data' => new NominationResource($nomination->fresh()),
            'nominee_id' => $nominee?->id,
            'message' => 'Nomination '.$validated['decision'].'.',
        ]);
    }
}
