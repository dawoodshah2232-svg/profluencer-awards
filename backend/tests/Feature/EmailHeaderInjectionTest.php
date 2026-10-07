<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Laravel 10 mitigation for GHSA-5vg9-5847-vvmq: email fields must reject
 * CR/LF so nothing can be smuggled into a mail header.
 */
class EmailHeaderInjectionTest extends TestCase
{
    use RefreshDatabase;

    private function enquiry(string $email): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/v1/enquiries', [
            'name' => 'Test Person',
            'email' => $email,
            'subject' => 'Hello there',
            'message' => 'This is a test enquiry message.',
        ]);
    }

    public function test_email_with_line_break_is_rejected(): void
    {
        $this->enquiry("victim@example.com\r\nBcc: attacker@example.com")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->enquiry("victim@example.com\nBcc: attacker@example.com")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseCount('enquiries', 0);
    }

    public function test_normal_email_is_accepted(): void
    {
        $this->enquiry('person@example.com')->assertSuccessful();

        $this->assertDatabaseHas('enquiries', ['email' => 'person@example.com']);
    }
}
