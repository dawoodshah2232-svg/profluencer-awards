<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InfluencerAccount;
use App\Models\Nominee;
use App\Models\User;
use App\Rules\NoLineBreaks;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Login accounts: staff (super_admin / admin / editor) and influencer
 * clients. Only super_admin and admin reach these routes; only a
 * super_admin may create, edit or delete another super_admin.
 */
class UserController extends Controller
{
    private const ROLES = [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN, User::ROLE_EDITOR, User::ROLE_INFLUENCER];

    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('influencerAccount.nominee.category')->orderBy('role')->orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        return response()->json(['data' => $query->get()->map(fn (User $u): array => $this->present($u))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'email' => ['required', new NoLineBreaks, 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
            'role' => ['required', Rule::in(self::ROLES)],
            // Influencer accounts: link an existing nominee, or create one.
            'nominee_id' => ['nullable', 'integer', 'exists:nominees,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'display_name' => ['nullable', 'string', 'max:150'],
            'handle' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:50'],
            'nominee_status' => ['nullable', Rule::in(['pending', 'approved', 'rejected', 'changes_requested'])],
        ]);

        $this->guardSuperAdmin($request, $validated['role']);

        if ($validated['role'] === User::ROLE_INFLUENCER && empty($validated['nominee_id']) && empty($validated['category_id'])) {
            return response()->json([
                'message' => 'Choose a category (or an existing nominee) for an influencer account.',
                'errors' => ['category_id' => ['Choose a category for this influencer.']],
            ], 422);
        }

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => trim($validated['name']),
                'email' => mb_strtolower(trim($validated['email'])),
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);

            if ($user->isInfluencer()) {
                $nomineeId = $validated['nominee_id'] ?? null;
                if ($nomineeId === null) {
                    $nomineeId = Nominee::create([
                        'category_id' => $validated['category_id'],
                        'name' => trim($validated['display_name'] ?? '') ?: $user->name,
                        'handle' => $validated['handle'] ?? null,
                        'platform' => $validated['platform'] ?? null,
                        'status' => $validated['nominee_status'] ?? Nominee::STATUS_APPROVED,
                    ])->id;
                }
                // A nominee belongs to one login: re-linking moves it.
                InfluencerAccount::query()->where('nominee_id', $nomineeId)->delete();
                InfluencerAccount::create(['user_id' => $user->id, 'nominee_id' => $nomineeId]);
            }

            return $user;
        });

        AuditLogger::log('admin', $request->user(), 'user.created', $user, ['role' => $user->role]);

        return response()->json(['data' => $this->present($user->load('influencerAccount.nominee.category'))], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'email' => ['sometimes', new NoLineBreaks, 'email:rfc', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            'role' => ['sometimes', Rule::in(self::ROLES)],
        ]);

        $this->guardSuperAdmin($request, $user->role);
        if (isset($validated['role'])) {
            $this->guardSuperAdmin($request, $validated['role']);
            // Staff <-> influencer switches would orphan the nominee link.
            if (($validated['role'] === User::ROLE_INFLUENCER) !== $user->isInfluencer()) {
                return response()->json(['message' => 'Staff and influencer accounts cannot be converted into each other.'], 422);
            }
            if ($user->is($request->user()) && $validated['role'] !== $user->role) {
                return response()->json(['message' => 'You cannot change your own role.'], 422);
            }
        }

        $fields = array_keys(array_filter($validated, fn ($v) => $v !== null));
        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
            $user->tokens()->delete();
        } else {
            unset($validated['password']);
        }
        if (isset($validated['email'])) {
            $validated['email'] = mb_strtolower(trim($validated['email']));
        }

        $user->update($validated);
        AuditLogger::log('admin', $request->user(), 'user.updated', $user, ['fields' => $fields]);

        return response()->json(['data' => $this->present($user->fresh()->load('influencerAccount.nominee.category'))]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->is($request->user())) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }
        $this->guardSuperAdmin($request, $user->role);

        if ($user->role === User::ROLE_SUPER_ADMIN && User::query()->where('role', User::ROLE_SUPER_ADMIN)->count() <= 1) {
            return response()->json(['message' => 'At least one super admin must remain.'], 422);
        }

        AuditLogger::log('admin', $request->user(), 'user.deleted', $user, ['email' => $user->email, 'role' => $user->role]);
        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            InfluencerAccount::query()->where('user_id', $user->id)->delete();
            $user->delete();
        });

        return response()->json(['message' => 'Account deleted. The nominee profile (if any) is kept.']);
    }

    private function guardSuperAdmin(Request $request, string $role): void
    {
        abort_if(
            $role === User::ROLE_SUPER_ADMIN && $request->user()->role !== User::ROLE_SUPER_ADMIN,
            403,
            'Only a super admin can manage super admin accounts.'
        );
    }

    /** @return array<string, mixed> */
    private function present(User $u): array
    {
        $nominee = $u->influencerAccount?->nominee;

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'created_at' => $u->created_at?->toIso8601String(),
            'nominee' => $nominee ? [
                'id' => $nominee->id,
                'name' => $nominee->name,
                'status' => $nominee->status,
                'category' => $nominee->category?->name,
            ] : null,
        ];
    }
}
