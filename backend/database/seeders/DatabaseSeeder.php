<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            SettingSeeder::class,
            AdminUserSeeder::class,
            DemoInfluencerSeeder::class,
            SiteContentSeeder::class,
        ]);
    }
}
