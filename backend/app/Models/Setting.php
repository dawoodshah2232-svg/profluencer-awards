<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = ['key', 'value'];

    /**
     * Read a setting value with an optional default. Values are cached for
     * 60 seconds; writes bust the cache.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        return Cache::remember("pfa.setting.{$key}", 60, function () use ($key, $default): ?string {
            return static::query()->where('key', $key)->value('value') ?? $default;
        });
    }

    /**
     * Write a setting value and bust the cache.
     */
    public static function put(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("pfa.setting.{$key}");
    }

    /** Convenience: is public voting open right now (Asia/Dubai)? */
    public static function votingIsOpen(): bool
    {
        $start = static::get('voting_start');
        $end = static::get('voting_end');

        if ($start === null || $end === null) {
            return false;
        }

        $now = now('Asia/Dubai');
        // Settings store dates (times unconfirmed); the window covers the
        // whole days: start-of-day on voting_start through end-of-day on voting_end.
        $opensAt = Carbon::parse($start, 'Asia/Dubai')->startOfDay();
        $closesAt = Carbon::parse($end, 'Asia/Dubai')->endOfDay();

        return $now->between($opensAt, $closesAt);
    }

    public static function resultsPublished(): bool
    {
        return static::get('results_published', '0') === '1';
    }
}
