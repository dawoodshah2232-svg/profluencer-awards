<?php

namespace App\Http\Controllers;

use App\Http\Resources\NominationResource;
use App\Models\Nomination;
use App\Rules\NoLineBreaks;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public nomination submissions (reviewed later by admins).
 */
class NominationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'nominee_name' => ['required', 'string', 'min:2', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'reason' => ['nullable', 'string', 'max:2000'],
            'submitter_name' => ['required', 'string', 'min:2', 'max:150'],
            'submitter_email' => ['required', new NoLineBreaks, 'email:rfc', 'max:190'],
        ]);

        $nomination = Nomination::create($validated);

        AuditLogger::log('voter', null, 'nomination.submitted', $nomination, [
            'category_id' => $nomination->category_id,
        ]);

        return response()->json([
            'data' => new NominationResource($nomination),
            'message' => 'Thank you! Your nomination was received and is awaiting review.',
        ], 201);
    }
}
