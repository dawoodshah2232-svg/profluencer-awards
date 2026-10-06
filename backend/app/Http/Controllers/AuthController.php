<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\InfluencerAccount;
use App\Models\Nominee;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
            'email' => ['required', 'email', 'max:255'],
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
     * Influencer self-nomination: creates the portal account, the nominee
     * profile (status pending — an admin reviews before it goes public)
     * and links the two. Returns an API token so the nominee lands
     * straight in their dashboard.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'display_name' => ['required', 'string', 'min:2', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'platform' => ['nullable', 'string', 'max:50'],
            'handle' => ['nullable', 'string', 'max:120'],
            'profile_url' => ['nullable', 'url', 'max:255'],
            'bio' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($validated): array {
            $user = User::create([
                'name' => trim($validated['name']),
                'email' => mb_strtolower(trim($validated['email'])),
                'password' => Hash::make($validated['password']),
                'role' => 'influencer',
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
                'status' => Nominee::STATUS_PENDING,
            ]);

            InfluencerAccount::create([
                'user_id' => $user->id,
                'nominee_id' => $nominee->id,
            ]);

            $token = $user->createToken('api', ['influencer'])->plainTextToken;

            return [$user, $nominee, $token];
        });

        [$user, $nominee, $token] = $result;

        AuditLogger::log('influencer', $user, 'auth.registered', $nominee, [
            'category_id' => $nominee->category_id,
        ]);

        return response()->json([
            'data' => [
                'user' => new UserResource($user->load('influencerAccount.nominee')),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
            'message' => 'Nomination received. Our team will review your profile.',
        ], 201);
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
