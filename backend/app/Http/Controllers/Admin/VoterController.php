<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VoterResource;
use App\Models\Voter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only voter directory (privacy: phone shown as typed, never the
 * normalized key outside admin scope).
 */
class VoterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Voter::query()->withCount('votes')->latest();

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q
                ->where('name', 'like', $search)
                ->orWhere('email', 'like', $search)
                ->orWhere('phone_display', 'like', $search));
        }

        return VoterResource::collection($query->paginate(min(500, max(1, $request->integer('per_page', 50)))))->response();
    }

    public function show(Voter $voter): JsonResponse
    {
        $voter->load(['votes.nominee', 'votes.category']);

        return response()->json([
            'data' => (new VoterResource($voter))->additional([
                'votes' => $voter->votes->map(fn ($vote): array => [
                    'id' => $vote->id,
                    'status' => $vote->status,
                    'nominee' => $vote->nominee->name,
                    'category' => $vote->category->name,
                    'created_at' => $vote->created_at?->toIso8601String(),
                ]),
            ]),
        ]);
    }
}
