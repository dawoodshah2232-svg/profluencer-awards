<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\InfluencerAccount;
use App\Models\Nominee;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the demo influencer login (same shape as POST /auth/register,
 * but approved) from DEMO_USER_EMAIL / DEMO_USER_PASSWORD env vars.
 * Skipped when DEMO_USER_PASSWORD is empty; never touches an existing
 * user, so a password changed later is kept. Password is always hashed.
 */
class DemoInfluencerSeeder extends Seeder
{
    public function run(): void
    {
        $email = mb_strtolower(trim((string) env('DEMO_USER_EMAIL', 'user@profluencerawards.com')));
        $password = env('DEMO_USER_PASSWORD');

        if ($email === '' || empty($password)) {
            $this->command->warn('DemoInfluencerSeeder skipped: set DEMO_USER_PASSWORD in .env to create the demo user.');

            return;
        }

        if (User::query()->where('email', $email)->exists()) {
            $this->command->info("Demo user already exists: {$email}");

            return;
        }

        $category = Category::query()->orderBy('sort_order')->orderBy('id')->first();

        if ($category === null) {
            $this->command->warn('DemoInfluencerSeeder skipped: no categories (run CategorySeeder first).');

            return;
        }

        DB::transaction(function () use ($email, $password, $category): void {
            $user = User::create([
                'name' => 'Demo Influencer',
                'email' => $email,
                'password' => Hash::make($password),
                'role' => User::ROLE_INFLUENCER,
            ]);

            $nominee = Nominee::create([
                'category_id' => $category->id,
                'name' => 'Demo Influencer',
                'handle' => '@demo',
                'platform' => 'Instagram',
                'country' => 'UAE',
                'city' => 'Dubai',
                'status' => Nominee::STATUS_APPROVED,
            ]);

            InfluencerAccount::create([
                'user_id' => $user->id,
                'nominee_id' => $nominee->id,
            ]);
        });

        $this->command->info("Demo user created: {$email}");
    }
}
