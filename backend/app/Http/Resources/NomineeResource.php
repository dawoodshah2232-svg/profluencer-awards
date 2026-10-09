<?php

namespace App\Http\Resources;

use App\Models\Nominee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Nominee */
class NomineeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'handle' => $this->handle,
            'platform' => $this->platform,
            'bio' => $this->bio,
            'photo_url' => $this->photo_url,
            'mobile' => $this->mobile,
            'country' => $this->country,
            'city' => $this->city,
            'profile_url' => $this->profile_url,
            'followers' => $this->followers,
            'status' => $this->status,
            // Review details: staff, or the nominee's own logged-in account.
            'review_notes' => $this->when($this->canSeeReview($request), $this->review_notes),
            'verification' => $this->when($this->canSeeReview($request), $this->verification),
            'reviewed_at' => $this->when($this->canSeeReview($request), fn () => $this->reviewed_at?->toIso8601String()),
            // Vote totals are only exposed when the caller is allowed to see
            // them (live voting or published results); otherwise omitted.
            'votes_count' => $this->when(
                $request->attributes->get('expose_votes', false),
                $this->votes_count
            ),
            'category' => new CategoryResource($this->whenLoaded('category')),
            // Login email of the linked influencer account (admin listing only).
            'email' => $this->whenLoaded('influencerAccount', fn () => $this->influencerAccount?->user?->email),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    private function canSeeReview(Request $request): bool
    {
        $user = $request->user();
        if ($user === null) {
            return false;
        }

        return $user->isStaff() || $user->influencerAccount?->nominee_id === $this->id;
    }
}
