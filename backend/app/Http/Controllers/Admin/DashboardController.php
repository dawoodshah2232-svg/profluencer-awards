<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Enquiry;
use App\Models\Nomination;
use App\Models\Nominee;
use App\Models\Rsvp;
use App\Models\Setting;
use App\Models\Vote;
use App\Models\Voter;
use Illuminate\Http\JsonResponse;

/**
 * Organiser CRM overview: KPIs, per-category breakdown, integrity signals.
 */
class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $counted = fn () => Vote::query()->where('status', Vote::STATUS_COUNTED)->count();

        $categories = Category::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Category $c): array => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'nominees_approved' => Nominee::query()->where('category_id', $c->id)->where('status', 'approved')->count(),
                'nominees_pending' => Nominee::query()->where('category_id', $c->id)->where('status', 'pending')->count(),
                'votes_counted' => Vote::query()->where('category_id', $c->id)->where('status', 'counted')->count(),
            ]);

        return response()->json([
            'data' => [
                'kpis' => [
                    'nominees_total' => Nominee::query()->count(),
                    'nominees_approved' => Nominee::query()->where('status', 'approved')->count(),
                    'nominees_pending' => Nominee::query()->where('status', 'pending')->count(),
                    'votes_counted' => $counted(),
                    'votes_held' => Vote::query()->where('status', 'held')->count(),
                    'votes_invalidated' => Vote::query()->where('status', 'invalidated')->count(),
                    'voters' => Voter::query()->count(),
                    'nominations_pending' => Nomination::query()->where('status', 'pending')->count(),
                    'rsvps' => Rsvp::query()->count(),
                    'rsvps_checked_in' => Rsvp::query()->whereNotNull('checked_in_at')->count(),
                    'enquiries_unread' => Enquiry::query()->whereNull('read_at')->count(),
                    'duplicate_attempts_blocked' => AuditLog::query()->where('action', 'vote.duplicate_blocked')->count(),
                ],
                'voting_open' => Setting::votingIsOpen(),
                'results_published' => Setting::resultsPublished(),
                'categories' => $categories,
            ],
        ]);
    }
}
