<?php

namespace App\Http\Controllers;

use App\Http\Resources\NomineeResource;
use App\Models\Nominee;
use App\Models\Setting;
use App\Models\Vote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Influencer portal: the logged-in nominee's own performance data.
 * Requires role=influencer and a linked influencer_accounts row.
 */
class InfluencerController extends Controller
{
    public const MILESTONES = [10, 50, 100, 250, 500, 1000];

    private function nominee(Request $request): Nominee
    {
        $nominee = $request->user()->influencerAccount?->nominee;

        abort_if($nominee === null, 404, 'No nominee profile is linked to this account.');

        return $nominee;
    }

    public function me(Request $request): JsonResponse
    {
        $request->attributes->set('expose_votes', true);

        return response()->json([
            'data' => new NomineeResource($this->nominee($request)->load('category')),
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $nominee = $this->nominee($request)->load('category');
        $votes = $nominee->votes_count;

        $rank = Nominee::query()
            ->where('category_id', $nominee->category_id)
            ->where('status', Nominee::STATUS_APPROVED)
            ->where('votes_count', '>', $votes)
            ->count() + 1;

        $totalInCategory = Nominee::query()
            ->where('category_id', $nominee->category_id)
            ->where('status', Nominee::STATUS_APPROVED)
            ->count();

        $counted = Vote::query()
            ->where('nominee_id', $nominee->id)
            ->where('status', Vote::STATUS_COUNTED);

        $today = (clone $counted)->whereDate('created_at', today('Asia/Dubai'))->count();
        $last7 = (clone $counted)->where('created_at', '>=', now('Asia/Dubai')->subDays(7))->count();

        $bestDay = Vote::query()
            ->where('nominee_id', $nominee->id)
            ->where('status', Vote::STATUS_COUNTED)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->orderByDesc('total')
            ->first();

        $milestones = array_map(fn (int $target): array => [
            'target' => $target,
            'reached' => $votes >= $target,
            'progress' => min(100, (int) round($votes / $target * 100)),
        ], self::MILESTONES);

        return response()->json([
            'data' => [
                'votes' => $votes,
                'rank' => $rank,
                'total_in_category' => $totalInCategory,
                'momentum' => [
                    'today' => $today,
                    'last_7_days' => $last7,
                    'best_day' => $bestDay ? ['date' => $bestDay->day, 'votes' => (int) $bestDay->total] : null,
                ],
                'milestones' => $milestones,
                'voting_open' => Setting::votingIsOpen(),
                'results_published' => Setting::resultsPublished(),
            ],
        ]);
    }

    /**
     * The nominee's own category top 5. Visible while voting is live or
     * after results are published.
     */
    public function leaderboard(Request $request): JsonResponse
    {
        $nominee = $this->nominee($request);

        if (! Setting::votingIsOpen() && ! Setting::resultsPublished()) {
            return response()->json(['message' => 'The leaderboard is not available yet.'], 403);
        }

        $request->attributes->set('expose_votes', true);

        $top = Nominee::query()
            ->where('category_id', $nominee->category_id)
            ->where('status', Nominee::STATUS_APPROVED)
            ->orderByDesc('votes_count')
            ->limit((int) Setting::get('awards_per_category', '5'))
            ->get()
            ->values()
            ->map(fn (Nominee $n, int $i): array => [
                'rank' => $i + 1,
                'is_me' => $n->id === $nominee->id,
                'nominee' => new NomineeResource($n),
            ]);

        return response()->json(['data' => $top]);
    }
}
