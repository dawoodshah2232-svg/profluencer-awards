<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Voting window moved to Oct 20 – Nov 30, 2026. Updates the stored
     * setting (only if it still holds the old default, so an admin's own
     * later change is never overwritten) and the date wording in the
     * seeded FAQ / news content.
     */
    private const TEXT = [
        'October 15' => 'October 20',
        '15 October' => '20 October',
        'Oct 15' => 'Oct 20',
    ];

    public function up(): void
    {
        $this->apply('2026-10-15', '2026-10-20', self::TEXT);
    }

    public function down(): void
    {
        $this->apply('2026-10-20', '2026-10-15', array_flip(self::TEXT));
    }

    /** @param  array<string, string>  $text */
    private function apply(string $from, string $to, array $text): void
    {
        DB::table('settings')->where('key', 'voting_start')->where('value', $from)
            ->update(['value' => $to, 'updated_at' => now()]);
        Cache::forget('pfa.setting.voting_start');

        foreach (DB::table('site_contents')->get(['id', 'subtitle', 'body']) as $row) {
            $subtitle = $row->subtitle === null ? null : strtr($row->subtitle, $text);
            $body = $row->body === null ? null : strtr($row->body, $text);
            if ($subtitle !== $row->subtitle || $body !== $row->body) {
                DB::table('site_contents')->where('id', $row->id)->update(['subtitle' => $subtitle, 'body' => $body, 'updated_at' => now()]);
            }
        }
    }
};
