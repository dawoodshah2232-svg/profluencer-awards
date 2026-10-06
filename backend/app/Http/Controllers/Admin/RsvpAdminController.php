<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\RsvpResource;
use App\Models\Rsvp;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Ceremony RSVP management + door check-in.
 */
class RsvpAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Rsvp::query()->latest();

        if ($request->filled('guest_type')) {
            $query->where('guest_type', $request->string('guest_type'));
        }

        if ($request->boolean('checked_in')) {
            $query->whereNotNull('checked_in_at');
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $search)->orWhere('email', 'like', $search));
        }

        return RsvpResource::collection($query->paginate(50))->response();
    }

    public function checkIn(Request $request, Rsvp $rsvp): JsonResponse
    {
        if ($rsvp->isCheckedIn()) {
            return response()->json([
                'data' => new RsvpResource($rsvp),
                'message' => 'Already checked in.',
            ], 200);
        }

        $rsvp->forceFill(['checked_in_at' => now()])->save();

        AuditLogger::log('admin', $request->user(), 'rsvp.checked_in', $rsvp);

        return response()->json([
            'data' => new RsvpResource($rsvp->fresh()),
            'message' => 'Checked in.',
        ]);
    }
}
