<?php

namespace App\Http\Controllers;

use App\Http\Resources\CategoryResource;
use App\Http\Resources\NomineeResource;
use App\Models\Category;
use App\Models\ResultSnapshot;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public, unauthenticated endpoints for the awards website.
 */
class PublicController extends Controller
{
    /**
     * Public configuration the frontend needs (voting window, ceremony,
     * result visibility). Never exposes secrets.
     */
    public function settings(): JsonResponse
    {
        return response()->json([
            'data' => [
                'voting_start' => Setting::get('voting_start'),
                'voting_end' => Setting::get('voting_end'),
                'voting_open' => Setting::votingIsOpen(),
                'ceremony_date' => Setting::get('ceremony_date'),
                'ceremony_time' => Setting::get('ceremony_time'),
                'ceremony_city' => Setting::get('ceremony_city'),
                'ceremony_session' => Setting::get('ceremony_session'),
                'ceremony_venue' => Setting::get('ceremony_venue'),
                'results_published' => Setting::resultsPublished(),
                'awards_per_category' => (int) Setting::get('awards_per_category', '5'),
                'edition' => Setting::get('edition', '2026'),
                'terms_version' => Setting::get('terms_version', '1.0'),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->withCount(['nominees' => fn ($q) => $q->where('status', 'approved')])
            ->orderBy('sort_order')
            ->get();

        return CategoryResource::collection($categories)->response();
    }

    /**
     * Approved nominees for a category. Vote totals are only included while
     * voting is live or after results are published.
     */
    public function nominees(Request $request, Category $category): JsonResponse
    {
        $request->attributes->set('expose_votes', $this->votesVisible());

        $nominees = $category->approvedNominees()->orderBy('name')->get();

        return NomineeResource::collection($nominees)->response();
    }

    /**
     * Category leaderboard (top N by counted votes). Hidden until voting is
     * live or results are published — never leak partial counts early.
     */
    public function leaderboard(Request $request, Category $category): JsonResponse
    {
        $limit = (int) Setting::get('awards_per_category', '5');

        if (Setting::resultsPublished()) {
            $snapshot = ResultSnapshot::query()->latest('version')->first();

            if ($snapshot !== null) {
                $payload = $snapshot->payload['categories'] ?? [];
                foreach ($payload as $row) {
                    if (($row['category_slug'] ?? null) === $category->slug) {
                        return response()->json([
                            'data' => $row['top'] ?? [],
                            'source' => 'snapshot',
                            'snapshot_version' => $snapshot->version,
                        ]);
                    }
                }
            }
        }

        if (! Setting::votingIsOpen()) {
            return response()->json(['message' => 'The leaderboard is not available yet.'], 403);
        }

        $request->attributes->set('expose_votes', true);

        $top = $category->approvedNominees()
            ->orderByDesc('votes_count')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => NomineeResource::collection($top),
            'source' => 'live',
        ]);
    }

    private function votesVisible(): bool
    {
        return Setting::votingIsOpen() || Setting::resultsPublished();
    }
}
