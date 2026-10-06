<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\NomineeResource;
use App\Models\Nominee;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin CRUD for shortlisted nominees.
 */
class NomineeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Nominee::query()->with('category')->orderBy('category_id')->orderBy('name');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $search)->orWhere('handle', 'like', $search));
        }

        $request->attributes->set('expose_votes', true);

        return NomineeResource::collection($query->paginate(50))->response();
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'bio' => ['nullable', 'string', 'max:5000'],
            'photo_url' => ['nullable', 'url', 'max:255'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected,changes_requested'],
        ]);

        $nominee = Nominee::create($validated);
        AuditLogger::log('admin', $request->user(), 'nominee.created', $nominee);

        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee)], 201);
    }

    public function show(Request $request, Nominee $nominee): JsonResponse
    {
        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee->load('category'))]);
    }

    public function update(Request $request, Nominee $nominee): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'bio' => ['nullable', 'string', 'max:5000'],
            'photo_url' => ['nullable', 'url', 'max:255'],
            'status' => ['sometimes', 'string', 'in:pending,approved,rejected,changes_requested'],
        ]);

        $nominee->update($validated);
        AuditLogger::log('admin', $request->user(), 'nominee.updated', $nominee, ['changes' => $validated]);

        $request->attributes->set('expose_votes', true);

        return response()->json(['data' => new NomineeResource($nominee->fresh())]);
    }

    public function destroy(Request $request, Nominee $nominee): JsonResponse
    {
        if ($nominee->votes()->exists()) {
            return response()->json([
                'message' => 'This nominee has votes and cannot be deleted. Reject it instead.',
                'code' => 'NOMINEE_HAS_VOTES',
            ], 409);
        }

        AuditLogger::log('admin', $request->user(), 'nominee.deleted', $nominee);
        $nominee->delete();

        return response()->json(['message' => 'Nominee deleted.']);
    }
}
