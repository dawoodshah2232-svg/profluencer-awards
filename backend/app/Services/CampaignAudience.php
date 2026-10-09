<?php

namespace App\Services;

use App\Models\Enquiry;
use App\Models\EmailSuppression;
use App\Models\Nominee;
use App\Models\ResultSnapshot;
use App\Models\Rsvp;
use App\Models\User;
use App\Models\Voter;

/**
 * Resolves a campaign audience into unique recipients
 * [email => ['email', 'name', 'vars']]. Unsubscribed emails are excluded.
 */
class CampaignAudience
{
    public const AUDIENCES = [
        'all_nominees' => 'All nominees (every registered creator)',
        'approved_nominees' => 'Approved nominees',
        'pending_nominees' => 'Nominees awaiting review / changes',
        'winners' => 'Category winners (published results)',
        'top_honourees' => 'All Top 5 honourees (published results)',
        'voters' => 'Voters',
        'rsvps' => 'Ceremony RSVPs',
        'enquiries' => 'Contact & sponsor enquiries',
        'staff' => 'Staff accounts',
        'everyone' => 'Everyone (nominees, voters, RSVPs, enquiries)',
        'custom' => 'Custom email list',
    ];

    /**
     * @param  array<string, mixed>  $filter  e.g. ['category_id' => 3]
     * @return array<string, array{email: string, name: string, vars: array<string, string>}>
     */
    public static function resolve(string $audience, array $filter = [], ?string $customEmails = null): array
    {
        $out = [];
        $add = function (?string $email, ?string $name, array $vars = []) use (&$out): void {
            $email = mb_strtolower(trim((string) $email));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || isset($out[$email])) {
                return;
            }
            $out[$email] = ['email' => $email, 'name' => trim((string) $name), 'vars' => $vars];
        };
        $categoryId = ! empty($filter['category_id']) ? (int) $filter['category_id'] : null;

        $nominees = function (?array $statuses, ?array $ids = null) use ($add, $categoryId): void {
            Nominee::query()
                ->with(['category', 'influencerAccount.user'])
                ->when($statuses, fn ($q) => $q->whereIn('status', $statuses))
                ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids ?: [0]))
                ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
                ->get()
                ->each(function (Nominee $n) use ($add): void {
                    $user = $n->influencerAccount?->user;
                    if ($user === null) {
                        return;
                    }
                    $add($user->email, $user->name ?: $n->name, [
                        'category' => (string) $n->category?->name,
                        'voting_link' => TemplateMailer::votingLink($n->id),
                    ]);
                });
        };

        $snapshotIds = function (bool $winnersOnly): array {
            $snapshot = ResultSnapshot::query()->latest('version')->first();
            $ids = [];
            foreach ($snapshot?->payload['categories'] ?? [] as $row) {
                foreach ($row['top'] ?? [] as $t) {
                    if (! $winnersOnly || (int) $t['rank'] === 1) {
                        $ids[] = (int) $t['nominee_id'];
                    }
                }
            }

            return $ids;
        };

        switch ($audience) {
            case 'all_nominees': $nominees(null); break;
            case 'approved_nominees': $nominees([Nominee::STATUS_APPROVED]); break;
            case 'pending_nominees': $nominees([Nominee::STATUS_PENDING, Nominee::STATUS_CHANGES_REQUESTED]); break;
            case 'winners': $nominees(null, $snapshotIds(true)); break;
            case 'top_honourees': $nominees(null, $snapshotIds(false)); break;
            case 'voters': Voter::query()->orderBy('id')->each(fn (Voter $v) => $add($v->email, $v->name)); break;
            case 'rsvps': Rsvp::query()->orderBy('id')->each(fn (Rsvp $r) => $add($r->email, $r->name)); break;
            case 'enquiries': Enquiry::query()->orderBy('id')->each(fn (Enquiry $e) => $add($e->email, $e->name)); break;
            case 'staff': User::query()->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_EDITOR])->each(fn (User $u) => $add($u->email, $u->name)); break;
            case 'everyone':
                $nominees(null);
                Voter::query()->orderBy('id')->each(fn (Voter $v) => $add($v->email, $v->name));
                Rsvp::query()->orderBy('id')->each(fn (Rsvp $r) => $add($r->email, $r->name));
                Enquiry::query()->orderBy('id')->each(fn (Enquiry $e) => $add($e->email, $e->name));
                break;
            case 'custom':
                foreach (preg_split('/[\s,;]+/', (string) $customEmails) ?: [] as $email) {
                    $add($email, '');
                }
                break;
        }

        if ($out !== []) {
            $suppressed = EmailSuppression::query()->whereIn('email', array_keys($out))->pluck('email')->all();
            foreach ($suppressed as $email) {
                unset($out[$email]);
            }
        }

        return $out;
    }
}
