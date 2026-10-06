<?php

namespace App\Mail;

use App\Models\Vote;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VoteOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Vote $vote,
        public string $code,
        public int $ttlMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your ProFluencer Awards verification code: {$this->code}",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.vote-otp-text',
            with: [
                'voterName' => $this->vote->voter->name,
                'nomineeName' => $this->vote->nominee->name,
                'categoryName' => $this->vote->category->name,
                'code' => $this->code,
                'ttlMinutes' => $this->ttlMinutes,
            ],
        );
    }
}
