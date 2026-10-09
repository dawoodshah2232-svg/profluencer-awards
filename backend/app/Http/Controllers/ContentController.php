<?php

namespace App\Http\Controllers;

use App\Http\Resources\SiteContentResource;
use App\Models\SiteContent;
use Illuminate\Http\JsonResponse;

/**
 * Public read access to published website content.
 */
class ContentController extends Controller
{
    public function index(string $type): JsonResponse
    {
        abort_unless(in_array($type, SiteContent::TYPES, true), 404);

        $rows = SiteContent::query()
            ->where('type', $type)
            ->where('is_published', true)
            ->orderBy('sort_order')->orderByDesc('id')
            ->get();

        return SiteContentResource::collection($rows)->response();
    }

    public function article(string $slug): JsonResponse
    {
        $row = SiteContent::query()
            ->where('type', 'news')->where('slug', $slug)->where('is_published', true)
            ->firstOrFail();

        return response()->json(['data' => new SiteContentResource($row)]);
    }
}
