-- ============================================================================
-- ProFluencer Awards — schema.sql
-- MySQL 8 / MariaDB 10.4+ · InnoDB · utf8mb4_unicode_ci
--
-- Plain-SQL companion to the Laravel migrations: same tables, columns and
-- indexes, so a cPanel user can import via phpMyAdmin without running Laravel.
--
-- Import order: schema.sql first, then seeds.sql.
-- Tables are created below in dependency order (parents before children).
-- ============================================================================

SET NAMES utf8mb4;

-- Allow clean re-imports (drop children before parents).
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `result_snapshots`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `enquiries`;
DROP TABLE IF EXISTS `rsvps`;
DROP TABLE IF EXISTS `nominations`;
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `voters`;
DROP TABLE IF EXISTS `influencer_accounts`;
DROP TABLE IF EXISTS `nominees`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- users — admin / staff accounts (influencers link via influencer_accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(255) NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `password`       VARCHAR(255) NOT NULL,
  `role`           ENUM('super_admin','admin','editor','influencer') NOT NULL DEFAULT 'admin',
  `remember_token` VARCHAR(100) DEFAULT NULL,
  `created_at`     TIMESTAMP NULL DEFAULT NULL,
  `updated_at`     TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- categories — the 10 award categories
-- ----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(120) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `sort_order`  TINYINT NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_unique` (`name`),
  UNIQUE KEY `categories_slug_unique` (`slug`),
  KEY `categories_sort_order_idx` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- nominees — approved/shortlisted influencers per category
-- votes_count is a cached counter, maintained by the application.
-- ----------------------------------------------------------------------------
CREATE TABLE `nominees` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `name`        VARCHAR(150) NOT NULL,
  `handle`      VARCHAR(120) DEFAULT NULL,
  `platform`    VARCHAR(50) DEFAULT NULL,
  `bio`         TEXT DEFAULT NULL,
  `photo_url`   VARCHAR(255) DEFAULT NULL,
  `mobile`      VARCHAR(40) DEFAULT NULL,
  `country`     VARCHAR(80) DEFAULT NULL,
  `city`        VARCHAR(80) DEFAULT NULL,
  `profile_url` VARCHAR(255) DEFAULT NULL,
  `status`      ENUM('pending','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
  `votes_count` INT NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nominees_category_status_idx` (`category_id`, `status`),
  CONSTRAINT `nominees_category_id_foreign`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- influencer_accounts — links a nominee to an optional portal login (users)
-- ----------------------------------------------------------------------------
CREATE TABLE `influencer_accounts` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED DEFAULT NULL,
  `nominee_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `influencer_accounts_user_id_unique` (`user_id`),
  UNIQUE KEY `influencer_accounts_nominee_id_unique` (`nominee_id`),
  CONSTRAINT `influencer_accounts_user_id_foreign`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `influencer_accounts_nominee_id_foreign`
    FOREIGN KEY (`nominee_id`) REFERENCES `nominees` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- voters — one row per voter identity.
-- email OR phone identifies the voter; both are unique across the table.
-- phone_normalized holds digits only, country-code normalized (e.g. 9715XXXXXXXX).
-- ----------------------------------------------------------------------------
CREATE TABLE `voters` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(150) NOT NULL,
  `email`            VARCHAR(190) NOT NULL,
  `phone_normalized` VARCHAR(30) NOT NULL,
  `phone_display`    VARCHAR(40) DEFAULT NULL,
  `verified_at`      DATETIME DEFAULT NULL,
  `created_at`       TIMESTAMP NULL DEFAULT NULL,
  `updated_at`       TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voters_email_unique` (`email`),
  UNIQUE KEY `voters_phone_normalized_unique` (`phone_normalized`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- votes — immutable ledger. Rows are NEVER deleted; fraud is handled by
-- flipping status to 'invalidated' (with a reason). Only 'counted' votes
-- contribute to totals.
-- Flow: held (OTP pending) -> counted (OTP verified) | invalidated (fraud).
-- ----------------------------------------------------------------------------
CREATE TABLE `votes` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `voter_id`          BIGINT UNSIGNED NOT NULL,
  `nominee_id`        BIGINT UNSIGNED NOT NULL,
  `category_id`       BIGINT UNSIGNED NOT NULL,
  `status`            ENUM('held','counted','invalidated') NOT NULL DEFAULT 'held',
  `otp_hash`          VARCHAR(255) DEFAULT NULL,
  `otp_expires_at`    DATETIME DEFAULT NULL,
  `otp_attempts`      TINYINT NOT NULL DEFAULT 0,
  `invalidated_reason` VARCHAR(255) DEFAULT NULL,
  `ip_hash`           CHAR(64) DEFAULT NULL,
  `user_agent`        VARCHAR(255) DEFAULT NULL,
  `idempotency_key`   VARCHAR(64) DEFAULT NULL,
  `created_at`        TIMESTAMP NULL DEFAULT NULL,
  `updated_at`        TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `votes_voter_category_unique` (`voter_id`, `category_id`),
  UNIQUE KEY `votes_idempotency_key_unique` (`idempotency_key`),
  KEY `votes_nominee_status_idx` (`nominee_id`, `status`),
  KEY `votes_status_created_idx` (`status`, `created_at`),
  CONSTRAINT `votes_voter_id_foreign`
    FOREIGN KEY (`voter_id`) REFERENCES `voters` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `votes_nominee_id_foreign`
    FOREIGN KEY (`nominee_id`) REFERENCES `nominees` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `votes_category_id_foreign`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- nominations — public nomination submissions awaiting review
-- ----------------------------------------------------------------------------
CREATE TABLE `nominations` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`     BIGINT UNSIGNED DEFAULT NULL,
  `nominee_name`    VARCHAR(150) NOT NULL,
  `handle`          VARCHAR(120) DEFAULT NULL,
  `platform`        VARCHAR(50) DEFAULT NULL,
  `reason`          TEXT DEFAULT NULL,
  `submitter_name`  VARCHAR(150) NOT NULL,
  `submitter_email` VARCHAR(190) NOT NULL,
  `status`          ENUM('pending','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
  `created_at`      TIMESTAMP NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nominations_category_id_idx` (`category_id`),
  KEY `nominations_status_idx` (`status`),
  CONSTRAINT `nominations_category_id_foreign`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- rsvps — ceremony attendance
-- ----------------------------------------------------------------------------
CREATE TABLE `rsvps` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(150) NOT NULL,
  `email`        VARCHAR(190) NOT NULL,
  `mobile`       VARCHAR(40) DEFAULT NULL,
  `guest_type`   ENUM('winner','honouree','guest','vip','media','team','nominee','sponsor','brand') NOT NULL DEFAULT 'guest',
  `guests_count` TINYINT NOT NULL DEFAULT 1,
  `checked_in_at` DATETIME DEFAULT NULL,
  `created_at`   TIMESTAMP NULL DEFAULT NULL,
  `updated_at`   TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rsvps_email_idx` (`email`),
  KEY `rsvps_guest_type_idx` (`guest_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- enquiries — contact-form messages
-- ----------------------------------------------------------------------------
CREATE TABLE `enquiries` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(150) NOT NULL,
  `email`      VARCHAR(190) NOT NULL,
  `subject`    VARCHAR(190) NOT NULL,
  `message`    TEXT NOT NULL,
  `read_at`    DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `enquiries_read_at_idx` (`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- audit_logs — append-only. The application must NEVER UPDATE or DELETE rows.
-- (Enforced in application code; grant the app DB user INSERT+SELECT only
-- on this table if you want it enforced at the database level.)
-- ----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_type`  VARCHAR(50) NOT NULL,
  `actor_id`    BIGINT UNSIGNED DEFAULT NULL,
  `action`      VARCHAR(100) NOT NULL,
  `subject_type` VARCHAR(100) DEFAULT NULL,
  `subject_id`  BIGINT UNSIGNED DEFAULT NULL,
  `meta`        JSON DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_actor_idx` (`actor_type`, `actor_id`),
  KEY `audit_logs_subject_idx` (`subject_type`, `subject_id`),
  KEY `audit_logs_action_idx` (`action`),
  KEY `audit_logs_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- settings — key/value configuration edited from the admin panel
-- (`key` is a reserved word, hence the backticks.)
-- ----------------------------------------------------------------------------
CREATE TABLE `settings` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- result_snapshots — versioned, published result sets (dual-approval in app).
-- ----------------------------------------------------------------------------
CREATE TABLE `result_snapshots` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `version`      INT NOT NULL,
  `published_by` BIGINT UNSIGNED DEFAULT NULL,
  `payload`      JSON NOT NULL,
  `published_at` DATETIME NOT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `result_snapshots_version_unique` (`version`),
  CONSTRAINT `result_snapshots_published_by_foreign`
    FOREIGN KEY (`published_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
