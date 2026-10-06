<?php

namespace App\Http\Controllers;

use App\Http\Resources\NomineeResource;
use App\Models\Category;
use App\Models\Nominee;
use App\Models\ResultSnapshot;
use App\Models\Setting;
use App\Models\Vote;
use App\Models\Voter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public discovery endpoints consumed by the React frontend.
 *
 * These complement PublicController with the list/detail/analytics shapes
 * the website needs. Everything here is public data: only approved
 * nominees and counted votes are ever exposed, and no voter PII leaves
 * the server.
 */
class DiscoveryController extends Controller
{
    /**
     * Voting window state for countdowns and gating.
     */
    public function votingState(): JsonResponse
    {
        $start = Setting::get('voting_start');
        $end = Setting::get('voting_end');

        $state = 'upcoming';
        if (Setting::votingIsOpen()) {
            $state = 'live';
        } elseif ($end && now('Asia/Dubai')->toDateString() > $end) {
            $state = 'ended';
        }

        return response()->json([
            'data' => [
                'state' => $state,
                'voting_open' => Setting::votingIsOpen(),
                'voting_start' => $start,
                'voting_end' => $end,
            ],
        ]);
    }

    /**
     * Public nominee directory. Only approved nominees are listed;
     * the status filter is accepted for compatibility but cannot widen
     * visibility beyond approved.
     */
    public function nominees(Request $request): JsonResponse
    {
        $query = Nominee::query()
            ->where('status', Nominee::STATUS_APPROVED)
            ->with('category')
            ->orderBy('name');

        if ($request->filled('category')) {
            $query->where('category_id', $request->integer('category'));
        }

        $request->attributes->set('expose_votes', Setting::votingIsOpen() || Setting::resultsPublished());

        return NomineeResource::collection($query->get())->response();
    }

    /**
     * Public nominee profile. Unapproved nominees are not discoverable.
     */
    public function show(Request $request, Nominee $nominee): JsonResponse
    {
        abort_if($nominee->status !== Nominee::STATUS_APPROVED, 404);

        $request->attributes->set('expose_votes', Setting::votingIsOpen() || Setting::resultsPublished());

        return response()->json(['data' => new NomineeResource($nominee->load('category'))]);
    }

    /**
     * Recent counted votes for a nominee (timestamps only — no voter PII).
     */
    public function votes(Request $request, Nominee $nominee): JsonResponse
    {
        abort_if($nominee->status !== Nominee::STATUS_APPROVED, 404);

        $limit = min($request->integer('limit', 50), 200);

        $votes = Vote::query()
            ->where('nominee_id', $nominee->id)
            ->where('status', Vote::STATUS_COUNTED)
            ->latest()
            ->limit($limit)
            ->get(['id', 'created_at']);

        return response()->json(['data' => $votes]);
    }

    /**
     * Counted votes inside a rolling window (milliseconds), for the
     * momentum widgets on nominee profiles and dashboards.
     */
    public function analytics(Request $request, Nominee $nominee): JsonResponse
    {
        abort_if($nominee->status !== Nominee::STATUS_APPROVED, 404);

        $windowMs = max(1, min($request->integer('window_ms', 3600000), 90 * 86400000));

        $count = Vote::query()
            ->where('nominee_id', $nominee->id)
            ->where('status', Vote::STATUS_COUNTED)
            ->where('created_at', '>=', now()->subMilliseconds($windowMs))
            ->count();

        return response()->json(['data' => ['count' => $count]]);
    }

    /**
     * Category statistics card data. Accepts a numeric id or a slug.
     */
    public function categoryStats(Request $request, string $category): JsonResponse
    {
        $cat = $this->resolveCategory($category);

        $approved = Nominee::query()->where('category_id', $cat->id)->where('status', Nominee::STATUS_APPROVED);

        return response()->json([
            'data' => [
                'id' => $cat->id,
                'approved_count' => (clone $approved)->count(),
                'total' => (clone $approved)->sum('votes_count'),
            ],
        ]);
    }

    /**
     * Top-5 leaderboard for a category. Accepts a numeric id or a slug.
     * Snapshot wins when results are published; otherwise live counts
     * while voting is open.
     */
    public function top5(Request $request, string $category): JsonResponse
    {
        $cat = $this->resolveCategory($category);
        $limit = (int) Setting::get('awards_per_category', '5');

        if (Setting::resultsPublished()) {
            $snapshot = ResultSnapshot::query()->latest('version')->first();
            $payload = $snapshot?->payload['categories'] ?? [];
            foreach ($payload as $row) {
                if (($row['category_slug'] ?? null) === $cat->slug) {
                    return response()->json(['data' => $row['top'] ?? [], 'source' => 'snapshot']);
                }
            }
        }

        abort_unless(Setting::votingIsOpen(), 403, 'The leaderboard is not available yet.');

        $request->attributes->set('expose_votes', true);

        $top = Nominee::query()
            ->where('category_id', $cat->id)
            ->where('status', Nominee::STATUS_APPROVED)
            ->orderByDesc('votes_count')
            ->limit($limit)
            ->get();

        return response()->json(['data' => NomineeResource::collection($top), 'source' => 'live']);
    }

    /**
     * Counted votes per day for the trailing N days (site-wide or one nominee).
     */
    public function votesPerDay(Request $request): JsonResponse
    {
        $days = max(1, min($request->integer('days', 14), 90));

        $query = Vote::query()->where('status', Vote::STATUS_COUNTED);

        if ($request->filled('nominee_id')) {
            $query->where('nominee_id', $request->integer('nominee_id'));
        }

        $rows = $query
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        $tz = 'Asia/Dubai';
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = now($tz)->subDays($i)->toDateString();
            $out[] = ['date' => $day, 'count' => (int) ($rows[$day]->count ?? 0)];
        }

        return response()->json(['data' => $out]);
    }

    /**
     * Counted votes grouped by category: { "<category_id>": count }.
     */
    public function votesByCategory(): JsonResponse
    {
        $rows = Vote::query()
            ->where('status', Vote::STATUS_COUNTED)
            ->selectRaw('category_id, COUNT(*) as count')
            ->groupBy('category_id')
            ->pluck('count', 'category_id');

        $out = [];
        foreach (Category::query()->orderBy('sort_order')->pluck('id') as $id) {
            $out[$id] = (int) ($rows[$id] ?? 0);
        }

        return response()->json(['data' => $out]);
    }

    /**
     * The currently published public results snapshot, if any.
     */
    public function results(): JsonResponse
    {
        abort_unless(Setting::resultsPublished(), 404, 'Results are not published yet.');

        $snapshot = ResultSnapshot::query()->latest('version')->first();
        abort_if($snapshot === null, 404, 'Results are not published yet.');

        return response()->json([
            'data' => [
                'snapshot' => $snapshot->payload,
                'version' => $snapshot->version,
                'published_at' => $snapshot->published_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Which nominee the voter already chose in a category (if any).
     * Identified by email+phone — the same identity the vote form uses.
     */
    public function myChoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'integer', 'exists:categories,id'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['required', 'string', 'max:25'],
        ]);

        $voter = Voter::findByIdentity(
            mb_strtolower(trim($validated['email'])),
            $validated['phone']
        );

        $nomineeId = null;
        if ($voter !== null) {
            $nomineeId = Vote::query()
                ->where('voter_id', $voter->id)
                ->where('category_id', $validated['category'])
                ->whereIn('status', [Vote::STATUS_HELD, Vote::STATUS_COUNTED])
                ->value('nominee_id');
        }

        return response()->json(['data' => ['nominee_id' => $nomineeId]]);
    }

    private function resolveCategory(string $category): Category
    {
        $query = is_numeric($category)
            ? Category::query()->where('id', (int) $category)
            : Category::query()->where('slug', $category);

        return $query->firstOrFail();
    }
}
