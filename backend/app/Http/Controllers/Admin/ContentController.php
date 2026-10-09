<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\SiteContentResource;
use App\Models\SiteContent;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Admin CRUD for website content (news, sponsor tiers, FAQs).
 */
class ContentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['type' => ['required', Rule::in(SiteContent::TYPES)]]);

        $rows = SiteContent::query()
            ->where('type', $request->string('type'))
            ->orderBy('sort_order')->orderByDesc('id')
            ->get();

        return SiteContentResource::collection($rows)->response();
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request, true);
        if ($validated['type'] === 'news') {
            $validated['slug'] = $this->uniqueSlug(($validated['slug'] ?? '') ?: $validated['title']);
        } else {
            $validated['slug'] = null;
        }
        $validated['sort_order'] ??= (int) SiteContent::query()->where('type', $validated['type'])->max('sort_order') + 1;

        $item = SiteContent::create($validated);
        AuditLogger::log('admin', $request->user(), 'content.created', $item, ['type' => $item->type]);

        return response()->json(['data' => new SiteContentResource($item)], 201);
    }

    public function update(Request $request, SiteContent $content): JsonResponse
    {
        $validated = $this->validated($request, false);
        if ($content->type !== 'news') {
            unset($validated['slug']);
        } elseif (array_key_exists('slug', $validated)) {
            $validated['slug'] = $this->uniqueSlug($validated['slug'] ?: ($validated['title'] ?? $content->title), $content->id);
        }

        $content->update($validated);
        AuditLogger::log('admin', $request->user(), 'content.updated', $content, ['type' => $content->type]);

        return response()->json(['data' => new SiteContentResource($content->fresh())]);
    }

    public function destroy(Request $request, SiteContent $content): JsonResponse
    {
        AuditLogger::log('admin', $request->user(), 'content.deleted', $content, ['type' => $content->type, 'title' => $content->title]);
        $content->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'type' => [$creating ? 'required' : 'prohibited', Rule::in(SiteContent::TYPES)],
            'slug' => ['nullable', 'string', 'max:160'],
            'title' => [$required, 'string', 'min:2', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:2000'],
            'body' => ['nullable', 'string', 'max:200000'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'meta' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
    }

    private function uniqueSlug(string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'article';
        $slug = $base;
        $i = 2;
        while (SiteContent::query()->where('type', 'news')->where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
