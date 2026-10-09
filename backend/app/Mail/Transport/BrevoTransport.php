<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\MessageConverter;

/**
 * Sends mail through Brevo's transactional email HTTP API
 * (POST https://api.brevo.com/v3/smtp/email) with an API key — no SMTP
 * port needed, which suits shared hosting where outbound SMTP is blocked.
 */
class BrevoTransport extends AbstractTransport
{
    public function __construct(private readonly string $apiKey)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $from = $email->getFrom()[0] ?? null;

        $map = fn (Address $a): array => array_filter(['email' => $a->getAddress(), 'name' => $a->getName() ?: null]);

        $payload = array_filter([
            'sender' => $from ? $map($from) : null,
            'to' => array_map($map, $email->getTo()),
            'cc' => array_map($map, $email->getCc()) ?: null,
            'bcc' => array_map($map, $email->getBcc()) ?: null,
            'replyTo' => ($r = $email->getReplyTo()[0] ?? null) ? $map($r) : null,
            'subject' => (string) $email->getSubject(),
            'htmlContent' => $email->getHtmlBody() ? (string) $email->getHtmlBody() : null,
            'textContent' => $email->getTextBody() ? (string) $email->getTextBody() : null,
        ]);

        $response = Http::timeout(15)
            ->withHeaders(['api-key' => $this->apiKey, 'accept' => 'application/json'])
            ->post('https://api.brevo.com/v3/smtp/email', $payload);

        if (! $response->successful()) {
            $reason = $response->json('message') ?: $response->body();
            throw new TransportException('Brevo rejected the email ('.$response->status().'): '.mb_substr((string) $reason, 0, 300));
        }
    }

    public function __toString(): string
    {
        return 'brevo+api';
    }
}
