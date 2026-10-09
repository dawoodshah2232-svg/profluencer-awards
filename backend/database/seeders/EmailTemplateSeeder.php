<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

/**
 * Default email templates. "system" templates are sent automatically by the
 * app (looked up by key); "campaign" templates are starting points for
 * admin campaigns. Inserts only keys that do not exist yet, so templates
 * the admin has edited are never overwritten by a later deploy.
 */
class EmailTemplateSeeder extends Seeder
{
    /** @return array<int, array<string, string|null>> */
    public static function templates(): array
    {
        return [
            // ---------------- system (sent automatically) ----------------
            [
                'key' => 'vote_otp', 'category' => 'system', 'name' => 'Vote verification code',
                'subject' => 'Your ProFluencer Awards verification code: {{code}}',
                'preheader' => 'Enter this code to count your vote for {{nominee_name}}.',
                'hero_eyebrow' => 'Verify your vote',
                'hero_title' => '{{code}}',
                'hero_subtitle' => 'Enter this code on the voting page to count your vote for {{nominee_name}} in {{category}}. It expires in 10 minutes.',
                'body_html' => '<p>Hello {{first_name}},</p><p>Thank you for voting at the ProFluencer Awards. Your vote is on hold until you enter the code above — unverified votes are never counted.</p><p>Didn\'t request this? You can safely ignore this email.</p>',
                'footer_note' => 'One vote per person per category. Votes are verified before results are published.',
            ],
            [
                'key' => 'password_reset', 'category' => 'system', 'name' => 'Password reset',
                'subject' => 'Reset your ProFluencer Awards password',
                'preheader' => 'Choose a new password — the link expires in 60 minutes.',
                'hero_eyebrow' => 'Account security',
                'hero_title' => 'Reset your password',
                'hero_subtitle' => 'We received a request to reset the password for your account.',
                'cta_label' => 'Choose a new password', 'cta_url' => '{{reset_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Use the button above to choose a new password. The link expires in <b>60 minutes</b> and can be used once.</p><p>If you did not ask for a reset, ignore this email — your password stays the same.</p>',
            ],
            [
                'key' => 'nomination_received', 'category' => 'system', 'name' => 'Nomination received',
                'subject' => 'We received your nomination, {{first_name}}',
                'preheader' => 'Our team is verifying your profile.',
                'hero_eyebrow' => 'Nomination received',
                'hero_title' => 'You are on your way to the stage',
                'hero_subtitle' => 'Thank you for nominating yourself in {{category}}.',
                'cta_label' => 'Open my dashboard', 'cta_url' => '{{dashboard_url}}',
                'body_html' => '<h2>What happens next</h2><ul><li><b>Verification</b> — the awards team checks that your profile is genuine and in the right category.</li><li><b>Approval</b> — once approved, your public voting page and QR code go live.</li><li><b>Voting</b> — {{voting_start}} to {{voting_end}}. Share your link everywhere.</li></ul><p>We will email you as soon as your profile has been reviewed.</p>',
            ],
            [
                'key' => 'nomination_approved', 'category' => 'system', 'name' => 'Nomination approved',
                'subject' => 'You are officially nominated, {{first_name}}!',
                'preheader' => 'Your voting page is live — start sharing.',
                'hero_eyebrow' => 'Nomination approved',
                'hero_title' => 'Congratulations — you are in!',
                'hero_subtitle' => 'Your profile is verified and live in {{category}}. Fans can now vote for you.',
                'cta_label' => 'View my voting page', 'cta_url' => '{{voting_link}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Your personal voting link is ready:</p><blockquote><a href="{{voting_link}}">{{voting_link}}</a></blockquote><h3>Make every vote count</h3><ul><li>Pin the link in your bio and story highlights.</li><li>Ask twice — once in a post, once in stories.</li><li>Use the ready-made messages and QR code in your <a href="{{dashboard_url}}">dashboard</a>.</li></ul><p>Voting runs <b>{{voting_start}} – {{voting_end}}</b>. The top 5 in each category are honoured on stage on {{ceremony_date}}.</p>',
            ],
            [
                'key' => 'nomination_changes', 'category' => 'system', 'name' => 'Nomination — changes requested',
                'subject' => 'Action needed on your nomination',
                'preheader' => 'A quick update is needed before we can approve your profile.',
                'hero_eyebrow' => 'Changes requested',
                'hero_title' => 'Almost there, {{first_name}}',
                'hero_subtitle' => 'The awards team needs a small update before approving your profile.',
                'cta_label' => 'Update my profile', 'cta_url' => '{{dashboard_url}}',
                'body_html' => '<p>Note from the awards team:</p><blockquote>{{notes}}</blockquote><p>Update your profile from your dashboard and it goes straight back into the review queue.</p>',
            ],
            [
                'key' => 'nomination_rejected', 'category' => 'system', 'name' => 'Nomination not approved',
                'subject' => 'An update on your nomination',
                'preheader' => 'Your nomination could not be approved.',
                'hero_eyebrow' => 'Nomination update',
                'hero_title' => 'Your nomination was not approved',
                'hero_subtitle' => 'Thank you for your interest in the ProFluencer Awards.',
                'body_html' => '<p>Hello {{first_name}},</p><p>After review, your nomination could not be approved this edition.</p><blockquote>{{notes}}</blockquote><p>If you think this is a mistake, reply to this email or <a href="{{site_url}}/#/contact">contact the awards team</a>.</p>',
            ],
            [
                'key' => 'rsvp_received', 'category' => 'system', 'name' => 'Ceremony RSVP received',
                'subject' => 'Your RSVP for the ProFluencer Awards',
                'preheader' => 'We have your RSVP for {{ceremony_date}}.',
                'hero_eyebrow' => 'RSVP received',
                'hero_title' => 'See you in {{ceremony_city}}',
                'hero_subtitle' => 'The awards afternoon — {{ceremony_date}}.',
                'cta_label' => 'Ceremony details', 'cta_url' => '{{event_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Thank you — your RSVP is recorded. The events team reviews every RSVP; confirmed guests receive their invitation with the venue and timing by email.</p>',
            ],
            [
                'key' => 'enquiry_received', 'category' => 'system', 'name' => 'Contact enquiry received',
                'subject' => 'We received your message',
                'preheader' => 'The ProFluencer Awards team will reply soon.',
                'hero_eyebrow' => 'Message received',
                'hero_title' => 'Thanks for getting in touch',
                'hero_subtitle' => 'Our team usually replies within two working days.',
                'body_html' => '<p>Hello {{first_name}},</p><p>This is a quick confirmation that your message reached the ProFluencer Awards team. We will get back to you at this email address.</p>',
            ],

            // ---------------- campaign starting points ----------------
            [
                'key' => 'campaign_nominations_open', 'category' => 'campaign', 'name' => 'Nominations are open',
                'subject' => 'Nominations are open — put your name on the ballot',
                'preheader' => '10 industries. 50 golden trophies. Decided by public vote.',
                'hero_eyebrow' => 'ProFluencer Awards 2026',
                'hero_title' => 'Nominations are open',
                'hero_subtitle' => '10 industries. 50 golden trophies. Decided entirely by verified public vote.',
                'hero_image_url' => 'img/hero.jpg',
                'cta_label' => 'Nominate yourself', 'cta_url' => '{{register_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Nomination is free and takes about three minutes. Choose your category, get verified, and receive your personal voting link and QR code.</p><p>Voting runs <b>{{voting_start}} – {{voting_end}}</b>, and the winners are crowned in {{ceremony_city}} on {{ceremony_date}}.</p>',
            ],
            [
                'key' => 'campaign_voting_open_nominees', 'category' => 'campaign', 'name' => 'Voting is open (to nominees)',
                'subject' => 'Voting is open — share your link, {{first_name}}',
                'preheader' => 'Your fans can vote for you from today.',
                'hero_eyebrow' => 'Voting is live',
                'hero_title' => 'Your campaign starts now',
                'hero_subtitle' => 'Voting is open until {{voting_end}}. Every verified vote counts.',
                'cta_label' => 'Open my voting page', 'cta_url' => '{{voting_link}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Your voting link for <b>{{category}}</b>:</p><blockquote><a href="{{voting_link}}">{{voting_link}}</a></blockquote><ul><li>Post it today and pin it in your bio.</li><li>Share the QR code from your <a href="{{dashboard_url}}">dashboard</a>.</li><li>Track your live rank on the <a href="{{leaderboard_url}}">leaderboard</a>.</li></ul>',
            ],
            [
                'key' => 'campaign_voting_open_public', 'category' => 'campaign', 'name' => 'Voting is open (public)',
                'subject' => 'Voting is open — support your favourite creators',
                'preheader' => 'One vote per category, verified by email.',
                'hero_eyebrow' => 'ProFluencer Awards 2026',
                'hero_title' => 'Voting is now open',
                'hero_subtitle' => 'Vote for one creator in each of the 10 categories until {{voting_end}}.',
                'hero_image_url' => 'img/trophy.jpg',
                'cta_label' => 'Vote now', 'cta_url' => '{{site_url}}/#/nominees',
                'body_html' => '<p>Hello {{first_name}},</p><p>The ProFluencer Awards are decided entirely by verified public vote — no juries. Pick your favourites, confirm with the code we email you, and follow the race on the <a href="{{leaderboard_url}}">live leaderboard</a>.</p>',
            ],
            [
                'key' => 'campaign_vote_reminder', 'category' => 'campaign', 'name' => 'Voting reminder — one week left',
                'subject' => 'One week left to vote',
                'preheader' => 'Voting closes on {{voting_end}}.',
                'hero_eyebrow' => 'Reminder',
                'hero_title' => 'One week left',
                'hero_subtitle' => 'Voting closes on {{voting_end}}. Have you voted in every category?',
                'cta_label' => 'See the leaderboard', 'cta_url' => '{{leaderboard_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>You can vote once in each of the 10 categories. The race is close in several of them — check the live standings and make your votes count.</p>',
            ],
            [
                'key' => 'campaign_last_day', 'category' => 'campaign', 'name' => 'Last day to vote',
                'subject' => 'Final call: voting closes today',
                'preheader' => 'Last chance to support your favourite creators.',
                'hero_eyebrow' => 'Final call',
                'hero_title' => 'Voting closes today',
                'hero_subtitle' => 'Votes cast after {{voting_end}} do not count.',
                'cta_label' => 'Vote now', 'cta_url' => '{{site_url}}/#/nominees',
                'body_html' => '<p>Hello {{first_name}},</p><p>This is the last day of public voting. Every verified vote is checked before the results are frozen and announced on stage on {{ceremony_date}}.</p>',
            ],
            [
                'key' => 'campaign_results', 'category' => 'campaign', 'name' => 'Winners announced',
                'subject' => 'The ProFluencer Awards 2026 winners are here',
                'preheader' => '50 creators. 10 industries. See who took the trophies.',
                'hero_eyebrow' => 'Official results',
                'hero_title' => 'Meet the winners',
                'hero_subtitle' => 'Verified by the awards team and celebrated live in {{ceremony_city}}.',
                'hero_image_url' => 'img/ceremony.jpg',
                'cta_label' => 'See all winners', 'cta_url' => '{{winners_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Thank you to every voter and nominee who made this edition happen. The full results, category winners and Top 5 Honourees are now published.</p>',
            ],
            [
                'key' => 'campaign_ceremony_invite', 'category' => 'campaign', 'name' => 'Ceremony invitation',
                'subject' => 'You are invited: ProFluencer Awards ceremony',
                'preheader' => '{{ceremony_date}} · {{ceremony_city}}',
                'hero_eyebrow' => 'You are invited',
                'hero_title' => 'The awards afternoon',
                'hero_subtitle' => '{{ceremony_date}} · {{ceremony_city}}',
                'hero_image_url' => 'img/ceremony.jpg',
                'cta_label' => 'RSVP now', 'cta_url' => '{{event_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Join us as 50 creators across 10 industries are honoured live on stage, followed by the evening gala.</p><p>Seats are limited — please RSVP so the events team can confirm your place.</p>',
            ],
            [
                'key' => 'campaign_ceremony_reminder', 'category' => 'campaign', 'name' => 'Ceremony reminder',
                'subject' => 'See you at the ProFluencer Awards',
                'preheader' => 'The awards afternoon is almost here.',
                'hero_eyebrow' => 'Almost time',
                'hero_title' => 'See you soon',
                'hero_subtitle' => '{{ceremony_date}} · {{ceremony_city}}',
                'cta_label' => 'Event details', 'cta_url' => '{{event_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>The awards afternoon is almost here. Please bring this email and arrive early for check-in. Dress code: black tie.</p>',
            ],
            [
                'key' => 'campaign_thank_you', 'category' => 'campaign', 'name' => 'Thank you',
                'subject' => 'Thank you for being part of the ProFluencer Awards',
                'preheader' => 'This edition was decided by you.',
                'hero_eyebrow' => 'Thank you',
                'hero_title' => 'Decided by you',
                'hero_subtitle' => 'Every trophy this year was earned one verified vote at a time.',
                'cta_label' => 'See the winners', 'cta_url' => '{{winners_url}}',
                'body_html' => '<p>Hello {{first_name}},</p><p>Thank you for voting, sharing and celebrating with us. Watch this space for news about the next edition.</p>',
            ],
            [
                'key' => 'campaign_newsletter', 'category' => 'campaign', 'name' => 'Newsletter (blank)',
                'subject' => 'News from the ProFluencer Awards',
                'preheader' => '',
                'hero_eyebrow' => 'ProFluencer Awards',
                'hero_title' => 'Your headline here',
                'hero_subtitle' => 'A short line that sets up the story.',
                'cta_label' => 'Read more', 'cta_url' => '{{site_url}}/#/news',
                'body_html' => '<p>Hello {{first_name}},</p><p>Write your update here. Use headings, lists and links — the layout, logo and footer are added automatically.</p>',
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::templates() as $t) {
            if (! EmailTemplate::query()->where('key', $t['key'])->exists()) {
                EmailTemplate::create($t);
            }
        }
    }
}
