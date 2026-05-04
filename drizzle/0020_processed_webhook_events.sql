-- 0020_processed_webhook_events.sql
--
-- Adds `processed_webhook_events` table for Paddle webhook idempotency
-- (Task 5.2 Finding #6). Paddle retries webhooks on non-2xx response and
-- on transient delivery failures, so the same `event_id` may arrive
-- multiple times. Without dedup we send duplicate emails and re-process
-- subscription state changes.
--
-- The table is intentionally small — only the event_id (Paddle's stable
-- ID per delivery) and a timestamp for garbage collection. Other event
-- metadata stays in Paddle and in our subscription columns.
--
-- Idempotent if run via apply-migration-0020.mjs — the apply script
-- swallows ER_DUP_FIELDNAME / ER_TABLE_EXISTS_ERROR so re-runs are safe.

CREATE TABLE IF NOT EXISTS `processed_webhook_events` (
  `event_id` VARCHAR(128) NOT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `processed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  INDEX `processed_webhook_events_processed_at_idx` (`processed_at`)
);
