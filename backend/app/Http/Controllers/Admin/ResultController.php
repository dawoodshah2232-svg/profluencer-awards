<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResultSnapshotResource;
use App\Models\Category;
use App\Models\ResultSnapshot;
use App\Models\Setting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Result publication. Publishing freezes the current counted totals into a
 * versioned snapshot (rank 1 = Category Winner, ranks 2–5 = Top 5 Honourees)
 * and flips the public `results_published` flag. Snapshots are never edited
 * or deleted — unpublishing only hides them from the public site.
 */
class ResultController extends Controller
{
    public function publish(Request $request): JsonResponse
    {
        $limit = (int) Setting::get('awards_per_category', '5');

        $snapshot = DB::transaction(function () use ($request, $limit): ResultSnapshot {
            $categories = Category::query()->orderBy('sort_order')->get()->map(
                fn (Category $category): array => [
                    'category_id' => $category->id,
                    'category_name' => $category->name,
                    'category_slug' => $category->slug,
                    'top' => $category->approvedNominees()
                        ->orderByDesc('votes_count')
                        ->limit($limit)
                        ->get()
                        ->values()
                        ->map(fn ($nominee, int $index): array => [
                            'rank' => $index + 1,
                            'title' => $index === 0 ? 'Category Winner' : 'Top 5 Honouree',
                            'nominee_id' => $nominee->id,
                            'nominee_name' => $nominee->name,
                            'handle' => $nominee->handle,
                            'platform' => $nominee->platform,
                            'photo_url' => $nominee->photo_url,
                            'votes_count' => $nominee->votes_count,
                        ])
                        ->all(),
                ]
            )->all();

            $version = (ResultSnapshot::query()->max('version') ?? 0) + 1;

            $created = ResultSnapshot::create([
                'version' => $version,
                'published_by' => $request->user()->id,
                'payload' => [
                    'categories' => $categories,
                    'awards_per_category' => $limit,
                ],
                'published_at' => now(),
            ]);

            Setting::put('results_published', '1');

            AuditLogger::log('admin', $request->user(), 'results.published', $created, [
                'version' => $version,
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
