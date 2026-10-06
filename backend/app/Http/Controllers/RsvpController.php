<?php

namespace App\Http\Controllers;

use App\Http\Resources\RsvpResource;
use App\Models\Rsvp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public ceremony RSVP submissions.
 */
class RsvpController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'guest_type' => ['nullable', 'string', 'in:guest,vip,media,winner,honouree,team,nominee,sponsor,brand'],
            'guests_count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $rsvp = Rsvp::create([
            'name' => $validated['name'],
            'email' => mb_strtolower(trim($validated['email'])),
            'mobile' => $validated['mobile'] ?? null,
            'guest_type' => $validated['guest_type'] ?? 'guest',
            'guests_count' => $validated['guests_count'] ?? 1,
        ]);

        return response()->json([
            'data' => new RsvpResource($rsvp),
            'message' => 'RSVP received. We look forward to seeing you in Dubai!',
        ], 201);
    }
}
