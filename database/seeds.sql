-- ============================================================================
-- ProFluencer Awards — seeds.sql
-- Import AFTER schema.sql (cPanel → phpMyAdmin → Import tab).
--
-- Seeds the 10 award categories and the base settings rows.
-- Safe to re-run: INSERT IGNORE skips rows that already exist.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 10 award categories (sort_order 1–10)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `categories` (`name`, `slug`, `description`, `sort_order`, `created_at`, `updated_at`) VALUES
('Fashion and Beauty',           'fashion-and-beauty',           'Style, beauty and fashion creators shaping trends across the region.',        1,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Lifestyle and Entertainment',  'lifestyle-and-entertainment',  'Lifestyle and entertainment voices with the most engaged audiences.',          2,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Travel and Hospitality',       'travel-and-hospitality',       'Travel storytellers and hospitality experiences worth following.',              3,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Food and Dining',              'food-and-dining',              'Food creators, chefs and dining experiences people love.',                     4,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Health Fitness and Wellness',  'health-fitness-and-wellness',  'Coaches and creators inspiring healthier, stronger living.',                   5,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Business and Entrepreneurship','business-and-entrepreneurship','Founders and business minds building what is next.',                          6,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Finance Trading and Crypto',   'finance-trading-and-crypto',   'Finance educators, traders and crypto voices the community trusts.',           7,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Technology and Innovation',    'technology-and-innovation',    'Tech reviewers and innovators making the future understandable.',              8,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Real Estate and Home',         'real-estate-and-home',         'Property experts and home creators guiding smarter living.',                  9,  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('Education Parenting and Family','education-parenting-and-family','Educators and family creators making learning part of everyday life.',       10, UTC_TIMESTAMP(), UTC_TIMESTAMP());

-- ----------------------------------------------------------------------------
-- Base settings. Voting open/close TIMES are unconfirmed — stored as dates
-- only; the admin panel can later set exact datetimes if needed.
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `settings` (`key`, `value`, `created_at`, `updated_at`) VALUES
('voting_start',       '2026-10-15', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('voting_end',         '2026-11-30', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('ceremony_date',      '2026-12-11', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('ceremony_city',      'Dubai',      UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('ceremony_session',   'afternoon',  UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('results_published',  '0',          UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('awards_per_category','5',          UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('edition',            '2026',       UTC_TIMESTAMP(), UTC_TIMESTAMP()),
('terms_version',      '1.0',        UTC_TIMESTAMP(), UTC_TIMESTAMP());
