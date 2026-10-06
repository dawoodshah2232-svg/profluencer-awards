<?php

namespace App\Jobs;

use App\Mail\VoteOtpMail;
use App\Models\Vote;
use App\Services\OtpService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the email OTP for a held vote. Runs on the `database` queue driver
 * (cPanel-compatible); process with `php artisan queue:work --stop-when-empty`.
 */
class SendVoteOtp implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $voteId, public string $code) {}

    public function handle(): void
    {
        $vote = Vote::with(['voter', 'nominee', 'category'])->find($this->voteId);

        if ($vote === null || ! $vote->isHeld()) {
            return;
        }

        Mail::to($vote->voter->email, $vote->voter->name)->send(
            new VoteOtpMail($vote, $this->code, OtpService::ttlMinutes())
        );
    }
}
