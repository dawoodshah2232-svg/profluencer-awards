<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

/**
 * Base settings. Voting open/close TIMES are unconfirmed — stored as dates
 * only, matching database/seeds.sql.
 */
class SettingSeeder extends Seeder
{
    /**
     * @return array<string, string>
     */
    public static function defaults(): array
    {
        return [
            'voting_start' => '2026-10-20',
            'voting_end' => '2026-11-30',
            'ceremony_date' => '2026-12-11',
            'ceremony_city' => 'Dubai',
            'ceremony_session' => 'afternoon',
            'results_published' => '0',
            'awards_per_category' => '5',
            'edition' => '2026',
            'terms_version' => '1.0',
        ];
    }

    public function run(): void
    {
        foreach (self::defaults() as $key => $value) {
            // updateOrCreate: re-running the seeder never clobbers values
            // an admin has changed in the panel... unless they are still the
            // default. Keep it simple and safe: only insert missing keys.
            Setting::query()->firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
