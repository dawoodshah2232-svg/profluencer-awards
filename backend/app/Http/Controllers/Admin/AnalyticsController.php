<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Enquiry;
use App\Models\Nomination;
use App\Models\Nominee;
use App\Models\Rsvp;
use App\Models\Vote;
use App\Models\Voter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin analytics and exports for the organiser CRM.
 * All routes sit behind the staff role middleware.
 */
class AnalyticsController extends Controller
{
    /**
     * Counted votes per hour for the trailing N hours (spike detection).
     */
    public function votesPerHour(Request $request): JsonResponse
    {
        $hours = max(1, min($request->integer('hours', 24), 168));
        $tz = 'Asia/Dubai';

        $rows = Vote::query()
            ->where('status', Vote::STATUS_COUNTED)
            ->where('created_at', '>=', now($tz)->subHours($hours))
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour, COUNT(*) as count")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        $out = [];
        for ($i = $hours - 1; $i >= 0; $i--) {
            $hour = now($tz)->subHours($i)->format('Y-m-d H:00');
            $out[] = ['hour' => $hour, 'count' => (int) ($rows[$hour]->count ?? 0)];
        }

        return response()->json(['data' => $out]);
    }

    /**
     * New voter registrations per day for the trailing N days.
     */
    public function newVotersPerDay(Request $request): JsonResponse
    {
        $days = max(1, min($request->integer('days', 7), 90));
        $tz = 'Asia/Dubai';

        $rows = Voter::query()
            ->where('created_at', '>=', now($tz)->subDays($days))
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = now($tz)->subDays($i)->toDateString();
            $out[] = ['date' => $day, 'count' => (int) ($rows[$day]->count ?? 0)];
        }

        return response()->json(['data' => $out]);
    }

    /**
     * How many duplicate-vote attempts were blocked (integrity KPI).
     */
    public function blockedAttempts(): JsonResponse
    {
        $count = AuditLog::query()->where('action', 'vote.duplicate_blocked')->count();

        return response()->json(['data' => ['count' => $count]]);
    }

    /**
     * Voter participation stats for the Voters tab.
     */
    public function voterStats(): JsonResponse
    {
        $voters = Voter::query()->count();
        $countedVotes = Vote::query()->where('status', Vote::STATUS_COUNTED)->count();

        $multiCategory = Voter::query()
            ->whereHas('votes', fn ($q) => $q->where('status', Vote::STATUS_COUNTED), '>', 1)
            ->count();

        $newToday = Voter::query()
            ->whereDate('created_at', today('Asia/Dubai'))
            ->count();

        return response()->json([
            'data' => [
                'voters' => $voters,
                'votes_counted' => $countedVotes,
                'avg_votes_per_voter' => $voters > 0 ? round($countedVotes / $voters, 1) : 0,
                'multi_category_voters' => $multiCategory,
                'new_voters_today' => $newToday,
            ],
        ]);
    }

    /**
     * CSV export for the CRM. Kinds: votes, voters, nominees, rsvps,
     * enquiries, nominations. Streams the file — no temp files.
     */
    public function export(Request $request, string $kind): StreamedResponse
    {
        $datasets = [
            'votes' => fn () => $this->voteRows(),
            'voters' => fn () => $this->voterRows(),
            'nominees' => fn () => $this->nomineeRows(),
            'rsvps' => fn () => $this->rsvpRows(),
            'enquiries' => fn () => $this->enquiryRows(),
            'nominations' => fn () => $this->nominationRows(),
        ];

        abort_unless(isset($datasets[$kind]), 404, 'Unknown export kind.');

        $rows = $datasets[$kind]();
        $filename = "profluencer-{$kind}-".now('Asia/Dubai')->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function voteRows(): array
    {
        $rows = [['id', 'status', 'nominee', 'category', 'voter_email', 'created_at']];
        foreach (Vote::query()->with(['nominee', 'category', 'voter'])->latest()->cursor() as $v) {
            $rows[] = [
                (string) $v->id, $v->status,
                $v->nominee?->name ?? '', $v->category?->name ?? '',
                $v->voter?->email ?? '', $v->created_at?->toDateTimeString() ?? '',
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function voterRows(): array
    {
        $rows = [['id', 'name', 'email', 'phone', 'verified_at', 'created_at']];
        foreach (Voter::query()->latest()->cursor() as $v) {
            $rows[] = [
                (string) $v->id, $v->name, $v->email, $v->phone_display ?? '',
                $v->verified_at?->toDateTimeString() ?? '', $v->created_at?->toDateTimeString() ?? '',
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function nomineeRows(): array
    {
        $rows = [['id', 'name', 'handle', 'platform', 'category', 'status', 'votes_count']];
        foreach (Nominee::query()->with('category')->orderBy('name')->cursor() as $n) {
            $rows[] = [
                (string) $n->id, $n->name, $n->handle ?? '', $n->platform ?? '',
                $n->category?->name ?? '', $n->status, (string) $n->votes_count,
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function rsvpRows(): array
    {
        $rows = [['id', 'name', 'email', 'guest_type', 'guests_count', 'checked_in_at']];
        foreach (Rsvp::query()->latest()->cursor() as $r) {
            $rows[] = [
                (string) $r->id, $r->name, $r->email, $r->guest_type,
                (string) $r->guests_count, $r->checked_in_at?->toDateTimeString() ?? '',
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function enquiryRows(): array
    {
        $rows = [['id', 'name', 'email', 'subject', 'read_at', 'created_at']];
        foreach (Enquiry::query()->latest()->cursor() as $e) {
            $rows[] = [
                (string) $e->id, $e->name, $e->email, $e->subject ?? '',
                $e->read_at?->toDateTimeString() ?? '', $e->created_at?->toDateTimeString() ?? '',
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function nominationRows(): array
    {
        $rows = [['id', 'nominee_name', 'handle', 'platform', 'category', 'submitter', 'status']];
        foreach (Nomination::query()->with('category')->latest()->cursor() as $n) {
            $rows[] = [
                (string) $n->id, $n->nominee_name, $n->handle ?? '', $n->platform ?? '',
                $n->category?->name ?? '', $n->submitter_name.' <'.$n->submitter_email.'>', $n->status,
            ];
        }

        return $rows;
    }
}
