<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResultSnapshotResource;
use App\Models\Category;
use App\Models\Nominee;
use App\Models\ResultSnapshot;
use App\Models\Setting;
use App\Models\Vote;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Result verification and publication.
 *
 * The admin reviews every approved nominee's vote breakdown (counted / held
 * / invalidated), confirms the winners per category — by default the top N
 * by counted votes, but the admin may set the final order after fraud
 * review — and publishes. Publishing freezes a versioned snapshot (rank 1 =
 * Category Winner, ranks 2..N = Top N Honourees) and flips the public
 * `results_published` flag. Snapshots are never edited or deleted.
 */
class ResultController extends Controller
{
    /**
     * Every approved nominee per category with their vote breakdown, ordered
     * by counted votes, plus the currently published selection (if any).
     */
    public function standings(): JsonResponse
    {
        $breakdown = Vote::query()
            ->selectRaw('nominee_id, status, COUNT(*) as n')
            ->groupBy('nominee_id', 'status')
            ->get()
            ->groupBy('nominee_id');

        $published = [];
        $snapshot = ResultSnapshot::query()->latest('version')->first();
        foreach ($snapshot?->payload['categories'] ?? [] as $row) {
            $published[$row['category_id']] = array_column($row['top'] ?? [], 'nominee_id');
        }

        $categories = Category::query()->orderBy('sort_order')->get()->map(function (Category $category) use ($breakdown, $published): array {
            $nominees = $category->approvedNominees()->orderByDesc('votes_count')->orderBy('id')->get()
                ->map(function (Nominee $n) use ($breakdown): array {
                    $b = ($breakdown[$n->id] ?? collect())->pluck('n', 'status');

                    return [
                        'id' => $n->id,
                        'name' => $n->name,
                        'handle' => $n->handle,
                        'platform' => $n->platform,
                        'photo_url' => $n->photo_url,
                        'votes_count' => (int) $n->votes_count,
                        'held' => (int) ($b[Vote::STATUS_HELD] ?? 0),
                        'invalidated' => (int) ($b[Vote::STATUS_INVALIDATED] ?? 0),
                    ];
                })->values();

            return [
                'category_id' => $category->id,
                'category_name' => $category->name,
                'nominees' => $nominees,
                'published' => $published[$category->id] ?? null,
            ];
        });

        return response()->json([
            'data' => [
                'awards_per_category' => (int) Setting::get('awards_per_category', '5'),
                'results_published' => Setting::resultsPublished(),
                'snapshot_version' => $snapshot?->version,
                'published_at' => $snapshot?->published_at?->toIso8601String(),
                'categories' => $categories,
            ],
        ]);
    }

    /**
     * Body (optional): { selections: { "<category_id>": [nominee_id, ...] } }
     * — the admin-confirmed winners in rank order. Categories without a
     * selection fall back to the top N by counted votes.
     */
    public function publish(Request $request): JsonResponse
    {
        $limit = (int) Setting::get('awards_per_category', '5');

        $validated = $request->validate([
            'selections' => ['nullable', 'array'],
            'selections.*' => ['array', 'max:'.$limit],
            'selections.*.*' => ['integer', 'distinct'],
        ]);
        $selections = $validated['selections'] ?? [];

        $snapshot = DB::transaction(function () use ($request, $limit, $selections): ResultSnapshot {
            $categories = [];
            $adminOrdered = 0;

            foreach (Category::query()->orderBy('sort_order')->get() as $category) {
                $byVotes = $category->approvedNominees()->orderByDesc('votes_count')->orderBy('id')->limit($limit)->get();

                if (isset($selections[$category->id]) && $selections[$category->id] !== []) {
                    $ids = array_map('intval', $selections[$category->id]);
                    $chosen = $category->approvedNominees()->whereIn('id', $ids)->get()->keyBy('id');
                    abort_if($chosen->count() !== count($ids), 422, "Every selected winner in {$category->name} must be an approved nominee of that category.");
                    $top = collect($ids)->map(fn (int $id) => $chosen[$id]);
                    if ($top->pluck('id')->all() !== $byVotes->pluck('id')->all()) {
                        $adminOrdered++;
                    }
                } else {
                    $top = $byVotes;
                }

                $categories[] = [
                    'category_id' => $category->id,
                    'category_name' => $category->name,
                    'category_slug' => $category->slug,
                    'top' => $top->values()->map(fn (Nominee $nominee, int $index): array => [
                        'rank' => $index + 1,
                        'title' => $index === 0 ? 'Category Winner' : "Top {$limit} Honouree",
                        'nominee_id' => $nominee->id,
                        'nominee_name' => $nominee->name,
                        'handle' => $nominee->handle,
                        'platform' => $nominee->platform,
                        'photo_url' => $nominee->photo_url,
                        'votes_count' => $nominee->votes_count,
                    ])->all(),
                ];
            }

            $version = (ResultSnapshot::query()->max('version') ?? 0) + 1;

            $created = ResultSnapshot::create([
                'version' => $version,
                'published_by' => $request->user()->id,
                'payload' => [
                    'categories' => $categories,
                    'awards_per_category' => $limit,
                    'confirmed_by' => $request->user()->name,
                ],
                'published_at' => now(),
            ]);

            Setting::put('results_published', '1');

            AuditLogger::log('admin', $request->user(), 'results.published', $created, [
                'version' => $version,
                'categories_reordered_by_admin' => $adminOrdered,
            ]);

            return $created;
        });

        return response()->json([
            'data' => new ResultSnapshotResource($snapshot),
            'message' => "Results published as snapshot v{$snapshot->version}.",
        ], 201);
    }

    public function unpublish(Request $request): JsonResponse
    {
        Setting::put('results_published', '0');

        AuditLogger::log('admin', $request->user(), 'results.unpublished');

        return response()->json(['message' => 'Results hidden from the public site. Snapshots are retained.']);
    }

    public function snapshots(Request $request): JsonResponse
    {
        $snapshots = ResultSnapshot::query()->latest('version')->paginate(20);

        return ResultSnapshotResource::collection($snapshots)->response();
    }

    public function show(Request $request, ResultSnapshot $snapshot): JsonResponse
    {
        $request->merge(['with_payload' => true]);

        return response()->json(['data' => new ResultSnapshotResource($snapshot)]);
    }
}
