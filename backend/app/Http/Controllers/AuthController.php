<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\InfluencerAccount;
use App\Models\Nominee;
use App\Models\User;
use App\Rules\NoLineBreaks;
use App\Services\AuditLogger;
use App\Services\GoogleIdToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Token authentication (Laravel Sanctum). Serves both the admin CRM
 * (roles: super_admin / admin / editor) and the influencer portal
 * (role: influencer, linked to a nominee via influencer_accounts).
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', new NoLineBreaks, 'email', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', mb_strtolower(trim($validated['email'])))->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('api', [$user->role])->plainTextToken;

        AuditLogger::log($user->isStaff() ? 'admin' : 'influencer', $user, 'auth.login');

        return response()->json([
            'data' => [
                'user' => new UserResource($user->load('influencerAccount.nominee')),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()->load('influencerAccount.nominee')),
        ]);
    }

    /**
     * Influencer self-nomination with email + password. Creates the portal
     * account and a pending nominee profile (an admin verifies it before it
     * goes public), then returns an API token for the dashboard.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate(self::profileRules() + [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'email' => ['required', new NoLineBreaks, 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ]);

        return $this->createInfluencer($validated, mb_strtolower(trim($validated['email'])), Hash::make($validated['password']), null);
    }

    /**
     * "Sign in with Google" for the influencer portal. mode=login signs an
     * existing account in (404 GOOGLE_NO_ACCOUNT when there is none, so the
     * page can switch to registration); mode=register also creates the
     * nominee profile from the submitted fields. The email always comes
     * from the verified Google token, never from the request.
     */
    public function google(Request $request): JsonResponse
    {
        $request->validate([
            'credential' => ['required', 'string', 'max:5000'],
            'mode' => ['nullable', 'in:login,register'],
        ]);

        $google = GoogleIdToken::verify((string) $request->input('credential'));
        if ($google === null) {
            return response()->json(['message' => 'Google sign-in could not be verified. Try again or use email and password.', 'code' => 'GOOGLE_INVALID'], 422);
        }

        $user = User::query()->where('google_sub', $google['sub'])->first()
            ?? User::query()->where('email', $google['email'])->first();

        if ($user !== null) {
            if ($user->isStaff()) {
                return response()->json(['message' => 'Staff accounts sign in from the admin panel.', 'code' => 'STAFF_ACCOUNT'], 403);
            }
            if ($user->google_sub === null) {
                $user->forceFill(['google_sub' => $google['sub']])->save();
            }

            return $this->issueToken($user, 'auth.login_google');
        }

        if ($request->input('mode') !== 'register') {
            return response()->json([
                'message' => 'No account uses this Google email yet. Complete your registration.',
                'code' => 'GOOGLE_NO_ACCOUNT',
                'data' => ['name' => $google['name'], 'email' => $google['email']],
            ], 404);
        }

        $validated = $request->validate(self::profileRules() + [
            'name' => ['nullable', 'string', 'min:2', 'max:150'],
        ]);
        $validated['name'] = trim($validated['name'] ?? '') ?: ($google['name'] ?: strtok($google['email'], '@'));

        // Google-only accounts get a random password; "Forgot password" can set one later.
        return $this->createInfluencer($validated, $google['email'], Hash::make(Str::random(40)), $google['sub']);
    }

    /** Emails a reset link. Always answers the same way so emails cannot be probed. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', new NoLineBreaks, 'email', 'max:190']]);
        $email = mb_strtolower(trim($validated['email']));

        if (Password::sendResetLink(['email' => $email]) === Password::RESET_LINK_SENT) {
            AuditLogger::log('system', null, 'auth.password_reset_requested', null, ['email' => $email]);
        }

        return response()->json(['message' => 'If an account exists for that email, a reset link is on its way.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', new NoLineBreaks, 'email', 'max:190'],
            'token' => ['required', 'string', 'max:200'],
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed'],
        ]);
        $validated['email'] = mb_strtolower(trim($validated['email']));

        $status = Password::reset($validated, function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password)])->save();
            $user->tokens()->delete();
            AuditLogger::log($user->isStaff() ? 'admin' : 'influencer', $user, 'auth.password_reset');
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'This reset link is invalid or has expired. Request a new one.', 'code' => 'RESET_INVALID'], 422);
        }

        return response()->json(['message' => 'Password updated. You can sign in now.']);
    }

    /**
     * Nominee profile fields shared by email and Google registration.
     *
     * @return array<string, array<int, mixed>>
     */
    private static function profileRules(): array
    {
        return [
            'display_name' => ['required', 'string', 'min:2', 'max:150'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'platform' => ['nullable', 'string', 'max:50'],
            'handle' => ['nullable', 'string', 'max:120'],
            'profile_url' => ['nullable', 'url', 'max:255'],
            'followers' => ['nullable', 'string', 'max:40'],
            'bio' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Creates the portal account, the pending nominee profile and the link
     * between them, then signs the new user in.
     *
     * @param  array<string, mixed>  $validated
     */
    private function createInfluencer(array $validated, string $email, string $passwordHash, ?string $googleSub): JsonResponse
    {
        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => ['An account with this email already exists. Sign in instead.']]);
        }

        [$user, $nominee] = DB::transaction(function () use ($validated, $email, $passwordHash, $googleSub): array {
            $user = User::create([
                'name' => trim($validated['name']),
                'email' => $email,
                'google_sub' => $googleSub,
                'password' => $passwordHash,
                'role' => User::ROLE_INFLUENCER,
            ]);

            $nominee = Nominee::create([
                'category_id' => $validated['category_id'],
                'name' => trim($validated['display_name']),
                'handle' => $validated['handle'] ?? null,
                'platform' => $validated['platform'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'mobile' => $validated['mobile'] ?? null,
                'country' => $validated['country'] ?? null,
                'city' => $validated['city'] ?? null,
                'profile_url' => $validated['profile_url'] ?? null,
                'followers' => $validated['followers'] ?? null,
                'status' => Nominee::STATUS_PENDING,
            ]);

            InfluencerAccount::create(['user_id' => $user->id, 'nominee_id' => $nominee->id]);

            return [$user, $nominee];
        });

        AuditLogger::log('influencer', $user, 'auth.registered', $nominee, [
            'category_id' => $nominee->category_id,
            'via' => $googleSub ? 'google' : 'email',
        ]);

        $response = $this->issueToken($user, null);
        $data = $response->getData(true);
        $data['message'] = 'Nomination received. Our team will verify your profile.';

        return $response->setData($data)->setStatusCode(201);
    }

    private function issueToken(User $user, ?string $auditAction): JsonResponse
    {
        $user->tokens()->delete();
        $token = $user->createToken('api', [$user->role])->plainTextToken;

        if ($auditAction !== null) {
            AuditLogger::log($user->isStaff() ? 'admin' : 'influencer', $user, $auditAction);
        }

        return response()->json([
            'data' => [
                'user' => new UserResource($user->load('influencerAccount.nominee')),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    /**
     * Staff sign-in for the admin CRM. Accepts a username (email or display
     * name) plus password; only staff roles may use it.
     */
    public function staffLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $identity = trim($validated['username']);
        $user = User::query()
            ->where('email', mb_strtolower($identity))
            ->orWhere('name', $identity)
            ->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password) || ! $user->isStaff()) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('admin', [$user->role])->plainTextToken;

        AuditLogger::log('admin', $user, 'auth.login');

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Signed out.']);
    }
}
