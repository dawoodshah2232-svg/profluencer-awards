<?php

namespace Database\Seeders;

use App\Models\SiteContent;
use Illuminate\Database\Seeder;

/**
 * Seeds the default website content (news, sponsor tiers, FAQs) from
 * database/data/site_content.json. Only runs for a content type that has
 * no rows yet, so anything the admin has edited or deleted is never
 * overwritten by a later deploy.
 */
class SiteContentSeeder extends Seeder
{
    public function run(): void
    {
        $rows = json_decode((string) file_get_contents(database_path('data/site_content.json')), true) ?: [];

        foreach (SiteContent::TYPES as $type) {
            if (SiteContent::query()->where('type', $type)->exists()) {
                continue;
            }

            foreach ($rows as $row) {
                if (($row['type'] ?? null) === $type) {
                    SiteContent::create($row + ['is_published' => true]);
                }
            }
        }
    }
}
