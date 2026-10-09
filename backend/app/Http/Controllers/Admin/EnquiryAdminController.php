<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnquiryResource;
use App\Models\Enquiry;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Contact-form enquiry inbox.
 */
class EnquiryAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enquiry::query()->latest();

        if ($request->filled('unread') && $request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        return EnquiryResource::collection($query->paginate(min(500, max(1, $request->integer('per_page', 50)))))->response();
    }

    public function markRead(Request $request, Enquiry $enquiry): JsonResponse
    {
        if (! $enquiry->isRead()) {
            $enquiry->forceFill(['read_at' => now()])->save();
        }

        return response()->json([
            'data' => new EnquiryResource($enquiry->fresh()),
            'message' => 'Marked as read.',
        ]);
    }

    /**
     * Compatibility update for the CRM: PATCH {read: true}.
     */
    public function update(Request $request, Enquiry $enquiry): JsonResponse
    {
        $validated = $request->validate([
            'read' => ['sometimes', 'boolean'],
        ]);

        if (($validated['read'] ?? false) === true) {
            return $this->markRead($request, $enquiry);
        }

        return response()->json(['data' => new EnquiryResource($enquiry)]);
    }

    public function destroy(Request $request, Enquiry $enquiry): JsonResponse
    {
        AuditLogger::log('admin', $request->user(), 'enquiry.deleted', $enquiry, ['email' => $enquiry->email]);
        $enquiry->delete();

        return response()->json(['message' => 'Enquiry deleted.']);
    }
}
