<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Admin CRUD for award categories.
 */
class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()->withCount('nominees')->orderBy('sort_order')->orderBy('id')->get();

        return CategoryResource::collection($categories)->response();
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request);
        $validated['slug'] = $this->uniqueSlug(($validated['slug'] ?? '') ?: $validated['name']);
        $validated['sort_order'] ??= (int) Category::query()->max('sort_order') + 1;

        $category = Category::create($validated);
        AuditLogger::log('admin', $request->user(), 'category.created', $category);

        return response()->json(['data' => new CategoryResource($category)], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $this->validated($request, $category);
        if (array_key_exists('slug', $validated)) {
            $validated['slug'] = $this->uniqueSlug($validated['slug'] ?: ($validated['name'] ?? $category->name), $category->id);
        }

        $category->update($validated);
        AuditLogger::log('admin', $request->user(), 'category.updated', $category, ['changes' => $validated]);

        return response()->json(['data' => new CategoryResource($category->fresh())]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        if ($category->nominees()->exists() || $category->votes()->exists()) {
            return response()->json([
                'message' => 'This category still has nominees or votes. Move or remove them first.',
                'code' => 'CATEGORY_IN_USE',
            ], 409);
        }

        AuditLogger::log('admin', $request->user(), 'category.deleted', $category, ['name' => $category->name]);
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Category $category = null): array
    {
        $required = $category === null ? 'required' : 'sometimes';

        return $request->validate([
            'name' => [$required, 'string', 'min:2', 'max:100', Rule::unique('categories', 'name')->ignore($category?->id)],
            'slug' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:127'],
        ]);
    }

    private function uniqueSlug(string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'category';
        $slug = $base;
        $i = 2;
        while (Category::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
