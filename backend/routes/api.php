<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CampaignController;
use App\Http\Controllers\Admin\EmailTemplateController;
use App\Http\Controllers\Admin\MailSettingController;
use App\Http\Controllers\EmailTrackingController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EnquiryAdminController;
use App\Http\Controllers\Admin\NominationReviewController;
use App\Http\Controllers\Admin\NomineeController;
use App\Http\Controllers\Admin\ResultController;
use App\Http\Controllers\Admin\RsvpAdminController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VoteAdminController;
use App\Http\Controllers\Admin\VoterController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\DiscoveryController;
use App\Http\Controllers\EnquiryController;
use App\Http\Controllers\InfluencerController;
use App\Http\Controllers\NominationController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\RsvpController;
use App\Http\Controllers\VoteController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| ProFluencer Awards API — v1
|--------------------------------------------------------------------------
| Served under /api/v1 (the `api` prefix comes from bootstrap/app.php).
| Public endpoints are rate-limited; everything under /admin requires a
| Sanctum token for a staff role, /influencer requires role=influencer.
*/

Route::prefix('v1')->group(function (): void {

    // -- Public ---------------------------------------------------------
    Route::get('/health', fn () => response()->json(['ok' => true, 'service' => 'profluencer-awards-api']));
    Route::get('/settings', [PublicController::class, 'settings']);
    Route::get('/voting/state', [DiscoveryController::class, 'votingState']);
    Route::get('/categories', [PublicController::class, 'categories']);
    Route::get('/categories/{category:slug}/nominees', [PublicController::class, 'nominees']);
    Route::get('/categories/{category:slug}/leaderboard', [PublicController::class, 'leaderboard']);
    Route::get('/categories/{category}/stats', [DiscoveryController::class, 'categoryStats']);
    Route::get('/categories/{category}/top5', [DiscoveryController::class, 'top5']);

    Route::get('/nominees', [DiscoveryController::class, 'nominees']);
    Route::get('/nominees/{nominee}', [DiscoveryController::class, 'show']);
    Route::get('/nominees/{nominee}/votes', [DiscoveryController::class, 'votes']);
    Route::get('/nominees/{nominee}/analytics', [DiscoveryController::class, 'analytics']);

    Route::get('/analytics/votes-per-day', [DiscoveryController::class, 'votesPerDay']);
    Route::get('/analytics/votes-by-category', [DiscoveryController::class, 'votesByCategory']);
    Route::get('/results', [DiscoveryController::class, 'results']);

    Route::get('/content/news/{slug}', [ContentController::class, 'article']);
    Route::get('/content/{type}', [ContentController::class, 'index']);

    Route::post('/votes', [VoteController::class, 'store'])->middleware('throttle:votes');
    Route::post('/votes/verify', [VoteController::class, 'verify'])->middleware('throttle:otp');
    Route::post('/votes/resend-otp', [VoteController::class, 'resend'])->middleware('throttle:otp');
    Route::get('/votes/my-choice', [DiscoveryController::class, 'myChoice'])->middleware('throttle:votes');

    Route::post('/nominations', [NominationController::class, 'store'])->middleware('throttle:nominations');
    Route::post('/rsvps', [RsvpController::class, 'store'])->middleware('throttle:nominations');
    Route::post('/enquiries', [EnquiryController::class, 'store'])->middleware('throttle:nominations');

    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:login');
    Route::post('/auth/google', [AuthController::class, 'google'])->middleware('throttle:login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:login');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:login');
    Route::get('/leaderboard', [DiscoveryController::class, 'leaderboard']);

    // Campaign email links: open-tracking pixel + one-click unsubscribe.
    Route::get('/e/o/{token}.gif', [EmailTrackingController::class, 'open'])->where('token', '[A-Za-z0-9]+');
    Route::get('/e/u/{token}', [EmailTrackingController::class, 'unsubscribe'])->where('token', '[A-Za-z0-9]+');
    Route::post('/admin/login', [AuthController::class, 'staffLogin'])->middleware('throttle:login');

    // -- Authenticated --------------------------------------------------
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Influencer portal
        Route::prefix('influencer')->middleware('role:influencer')->group(function (): void {
            Route::get('/me', [InfluencerController::class, 'me']);
            Route::get('/stats', [InfluencerController::class, 'stats']);
            Route::get('/leaderboard', [InfluencerController::class, 'leaderboard']);
            Route::patch('/profile', [InfluencerController::class, 'updateProfile']);
        });

        // Admin CRM
        Route::prefix('admin')->middleware('role:super_admin,admin,editor')->group(function (): void {
            Route::get('/dashboard', DashboardController::class);
            Route::post('/logout', [AuthController::class, 'logout']);

            Route::get('/analytics/votes-per-hour', [AnalyticsController::class, 'votesPerHour']);
            Route::get('/analytics/new-voters-per-day', [AnalyticsController::class, 'newVotersPerDay']);
            Route::get('/analytics/blocked-attempts', [AnalyticsController::class, 'blockedAttempts']);
            Route::get('/voters/stats', [AnalyticsController::class, 'voterStats']);
            Route::get('/export/{kind}', [AnalyticsController::class, 'export']);

            Route::apiResource('nominees', NomineeController::class);
            Route::post('/nominees/{nominee}/review', [NomineeController::class, 'review']);

            Route::get('/nominations', [NominationReviewController::class, 'index']);
            Route::get('/nominations/{nomination}', [NominationReviewController::class, 'show']);
            Route::post('/nominations/{nomination}/review', [NominationReviewController::class, 'review']);
            Route::patch('/nominations/{nomination}', [NominationReviewController::class, 'update']);
            Route::delete('/nominations/{nomination}', [NominationReviewController::class, 'destroy']);

            Route::get('/voters', [VoterController::class, 'index']);
            Route::get('/voters/{voter}', [VoterController::class, 'show']);

            Route::get('/votes', [VoteAdminController::class, 'index']);
            Route::get('/votes/{vote}', [VoteAdminController::class, 'show']);
            Route::post('/votes/{vote}/invalidate', [VoteAdminController::class, 'invalidate']);

            Route::get('/settings', [SettingController::class, 'index']);
            Route::put('/settings', [SettingController::class, 'update']);
            Route::patch('/settings', [SettingController::class, 'update']);

            Route::get('/results/standings', [ResultController::class, 'standings']);
            Route::post('/results/publish', [ResultController::class, 'publish']);
            Route::post('/results/unpublish', [ResultController::class, 'unpublish']);
            Route::delete('/results', [ResultController::class, 'unpublish']);
            Route::get('/results/snapshots', [ResultController::class, 'snapshots']);
            Route::get('/results/snapshots/{snapshot}', [ResultController::class, 'show']);

            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/audit', [AuditLogController::class, 'index']);

            Route::get('/rsvps', [RsvpAdminController::class, 'index']);
            Route::post('/rsvps/{rsvp}/check-in', [RsvpAdminController::class, 'checkIn']);
            Route::post('/rsvps/{rsvp}/checkin', [RsvpAdminController::class, 'checkIn']);
            Route::delete('/rsvps/{rsvp}/checkin', [RsvpAdminController::class, 'undoCheckIn']);
            Route::delete('/rsvps/{rsvp}', [RsvpAdminController::class, 'destroy']);

            Route::get('/enquiries', [EnquiryAdminController::class, 'index']);
            Route::post('/enquiries/{enquiry}/read', [EnquiryAdminController::class, 'markRead']);
            Route::patch('/enquiries/{enquiry}', [EnquiryAdminController::class, 'update']);
            Route::delete('/enquiries/{enquiry}', [EnquiryAdminController::class, 'destroy']);

            Route::get('/categories', [CategoryController::class, 'index']);
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::patch('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

            Route::get('/content', [AdminContentController::class, 'index']);
            Route::post('/content', [AdminContentController::class, 'store']);
            Route::patch('/content/{content}', [AdminContentController::class, 'update']);
            Route::delete('/content/{content}', [AdminContentController::class, 'destroy']);

            // Login accounts (staff + influencer clients), email delivery and
            // campaigns: super_admin / admin only.
            Route::middleware('role:super_admin,admin')->group(function (): void {
                Route::get('/mail-settings', [MailSettingController::class, 'show']);
                Route::put('/mail-settings', [MailSettingController::class, 'update']);
                Route::post('/mail-settings/test', [MailSettingController::class, 'test']);

                Route::get('/email-templates', [EmailTemplateController::class, 'index']);
                Route::post('/email-templates', [EmailTemplateController::class, 'store']);
                Route::post('/email-templates/preview', [EmailTemplateController::class, 'preview']);
                Route::patch('/email-templates/{template}', [EmailTemplateController::class, 'update']);
                Route::delete('/email-templates/{template}', [EmailTemplateController::class, 'destroy']);
                Route::post('/email-templates/{template}/test', [EmailTemplateController::class, 'test']);

                Route::get('/campaigns', [CampaignController::class, 'index']);
                Route::post('/campaigns', [CampaignController::class, 'store']);
                Route::post('/campaigns/audience-count', [CampaignController::class, 'audienceCount']);
                Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);
                Route::patch('/campaigns/{campaign}', [CampaignController::class, 'update']);
                Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy']);
                Route::post('/campaigns/{campaign}/send', [CampaignController::class, 'send']);
                Route::post('/campaigns/{campaign}/process', [CampaignController::class, 'process']);
                Route::post('/campaigns/{campaign}/duplicate', [CampaignController::class, 'duplicate']);

                Route::get('/users', [UserController::class, 'index']);
                Route::post('/users', [UserController::class, 'store']);
                Route::patch('/users/{user}', [UserController::class, 'update']);
                Route::delete('/users/{user}', [UserController::class, 'destroy']);
            });
        });
    });
});
