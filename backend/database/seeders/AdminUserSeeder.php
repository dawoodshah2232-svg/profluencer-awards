<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the first admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 * Skipped silently when ADMIN_PASSWORD is empty — set it, run the seeder,
 * then unset it. The password is always stored hashed.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('pfa.admin_email', env('ADMIN_EMAIL'));
        $password = env('ADMIN_PASSWORD');
        $name = env('ADMIN_NAME', 'Awards Admin');

        if (empty($email) || empty($password)) {
            $this->command->warn('AdminUserSeeder skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create the first admin.');

            return;
        }

        $user = User::query()->firstOrCreate(
            ['email' => mb_strtolower(trim($email))],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'role' => User::ROLE_SUPER_ADMIN,
            ]
        );

        if ($user->wasRecentlyCreated) {
            $this->command->info("Admin user created: {$user->email}");
        } else {
            $this->command->info("Admin user already exists: {$user->email}");
        }
    }
}
