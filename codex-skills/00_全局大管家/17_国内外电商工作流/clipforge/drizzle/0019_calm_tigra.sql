ALTER TABLE `media_edits` ADD `progress` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `media_edits` ADD `attempt_id` text;--> statement-breakpoint
ALTER TABLE `media_edits` ADD `heartbeat_at` integer;--> statement-breakpoint
ALTER TABLE `media_edits` ADD `transcript_snapshot` text;--> statement-breakpoint
ALTER TABLE `media_edits` ADD `batch_id` text;