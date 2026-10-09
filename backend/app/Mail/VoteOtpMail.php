<?php

namespace App\Mail;

use App\Models\EmailTemplate;
use App\Models\Vote;
use App\Services\EmailRenderer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Vote verification code. Uses the admin-editable "vote_otp" template when
 * it exists; falls back to the plain-text view otherwise.
 */
class VoteOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Vote $vote,
        public string $code,
        public int $ttlMinutes,
    ) {}

    /** @return array{subject: string, html: string, text: string}|null */
    private function rendered(): ?array
    {
        $template = EmailTemplate::query()->where('key', 'vote_otp')->first();
        if ($template === null) {
            return null;
        }

        return EmailRenderer::render($template, [
            'name' => $this->vote->voter->name,
            'email' => $this->vote->voter->email,
            'nominee_name' => $this->vote->nominee->name,
            'category' => $this->vote->category->name,
            'code' => $this->code,
        ]);
    }

    public function envelope(): Envelope
    {
        $out = $this->rendered();

        return new Envelope(
            subject: $out['subject'] ?? "Your ProFluencer Awards verification code: {$this->code}",
        );
    }

    public function content(): Content
    {
        $out = $this->rendered();
        if ($out !== null) {
            return new Content(htmlString: $out['html']);
        }

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
