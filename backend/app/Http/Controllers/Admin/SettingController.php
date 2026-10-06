<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Key/value settings (voting window, ceremony details, publish flags).
 * Every change is audit-logged.
 */
class SettingController extends Controller
{
    /** Keys the admin panel is allowed to write. */
    public const EDITABLE = [
        'voting_start',
        'voting_end',
        'ceremony_date',
        'ceremony_city',
        'ceremony_session',
        'ceremony_venue',
        'awards_per_category',
        'edition',
        'terms_version',
    ];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Setting::query()->orderBy('key')->get()->mapWithKeys(
                fn (Setting $s): array => [$s->key => $s->value]
            ),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable', 'string', 'max:1000'],
        ]);

        $changed = [];
        foreach ($validated['settings'] as $key => $value) {
            if (! in_array($key, self::EDITABLE, true)) {
                continue;
            }

            $before = Setting::get($key);
            if ($before !== $value) {
                Setting::put($key, $value);
                $changed[$key] = ['before' => $before, 'after' => $value];
            }
        }

        if ($changed !== []) {
            AuditLogger::log('admin', $request->user(), 'settings.updated', null, ['changed' => $changed]);
        }

        return response()->json([
            'data' => Setting::query()->orderBy('key')->get()->mapWithKeys(
                fn (Setting $s): array => [$s->key => $s->value]
            ),
            'changed' => array_keys($changed),
        ]);
    }
}
