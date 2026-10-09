<?php

use App\Models\Category;
use App\Models\InfluencerAccount;
use App\Models\Nominee;
use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Create or reset a login account from the server shell, e.g.
|   php artisan pfa:user owner@example.com --role=super_admin --name="Owner"
|   php artisan pfa:user client@example.com --role=influencer --category=1
| The password is prompted for (never pass it on the command line in
| production — it lands in shell history). An existing account keeps its
| role and only gets the new password.
*/
Artisan::command('pfa:user {email} {--role=influencer} {--name=} {--password=} {--category=}', function (string $email) {
    $email = mb_strtolower(trim($email));
    $role = (string) $this->option('role');
    if (! in_array($role, [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_EDITOR, User::ROLE_INFLUENCER], true)) {
        $this->error("Unknown role: {$role}");

        return 1;
    }

    $password = $this->option('password') ?: $this->secret('Password (min 8 characters)');
    if (strlen((string) $password) < 8) {
        $this->error('Password must be at least 8 characters.');

        return 1;
    }

    $existing = User::query()->where('email', $email)->first();
    if ($existing !== null) {
        $existing->forceFill(['password' => Hash::make($password)])->save();
        $existing->tokens()->delete();
        $this->info("Password reset for existing {$existing->role} account: {$email}");

        return 0;
    }

    $name = $this->option('name') ?: ucfirst(strtok($email, '@'));

    DB::transaction(function () use ($email, $role, $name, $password): void {
        $user = User::create(['name' => $name, 'email' => $email, 'password' => Hash::make($password), 'role' => $role]);

        if ($role === User::ROLE_INFLUENCER) {
            $categoryId = $this->option('category') ?: Category::query()->orderBy('sort_order')->value('id');
            $nominee = Nominee::create([
                'category_id' => $categoryId,
                'name' => $name,
                'status' => Nominee::STATUS_APPROVED,
            ]);
            InfluencerAccount::create(['user_id' => $user->id, 'nominee_id' => $nominee->id]);
        }
    });

    $this->info("Created {$role} account: {$email}");

    return 0;
})->purpose('Create (or reset the password of) an admin or influencer login');
