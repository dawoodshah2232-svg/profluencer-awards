<?php

namespace App\Http\Controllers;

use App\Http\Resources\NomineeResource;
use App\Models\Nominee;
use App\Models\Setting;
use App\Models\Vote;
use App\Services\AuditLogger;
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

    /**
     * The nominee edits their own profile. Allowed while the nomination is
     * not yet approved (approved profiles are locked — the awards team edits
     * them); saving after "changes requested" or a rejection sends the
     * nomination back to the review queue.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $nominee = $this->nominee($request);

        if ($nominee->status === Nominee::STATUS_APPROVED) {
            return response()->json([
                'message' => 'Your profile is approved and locked. Contact the awards team to change it.',
                'code' => 'PROFILE_LOCKED',
            ], 409);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'profile_url' => ['nullable', 'url', 'max:255'],
            'followers' => ['nullable', 'string', 'max:40'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
        ]);

        $validated['status'] = Nominee::STATUS_PENDING;
        $nominee->update($validated);

        AuditLogger::log('influencer', $request->user(), 'nominee.profile_resubmitted', $nominee);

        $request->attributes->set('expose_votes', true);

        return response()->json([
            'data' => new NomineeResource($nominee->fresh()->load('category')),
            'message' => 'Profile updated and sent for review.',
        ]);
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
