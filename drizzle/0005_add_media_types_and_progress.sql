-- Add mediaType column to albums
ALTER TABLE `albums` ADD `media_type` text NOT NULL DEFAULT 'music';--> statement-breakpoint
CREATE INDEX `albums_media_type_idx` ON `albums` (`media_type`);--> statement-breakpoint

-- Add mediaType and podcast/audiobook metadata columns to tracks
ALTER TABLE `tracks` ADD `media_type` text NOT NULL DEFAULT 'music';--> statement-breakpoint
ALTER TABLE `tracks` ADD `description` text;--> statement-breakpoint
ALTER TABLE `tracks` ADD `published_at` text;--> statement-breakpoint
ALTER TABLE `tracks` ADD `episode_number` integer;--> statement-breakpoint
CREATE INDEX `tracks_media_type_idx` ON `tracks` (`media_type`);--> statement-breakpoint

-- Create playback_progress table for podcast/audiobook resume and played/unplayed tracking
CREATE TABLE `playback_progress` (
	`track_id` text PRIMARY KEY NOT NULL REFERENCES `tracks`(`id`) ON DELETE CASCADE,
	`position_ms` integer NOT NULL DEFAULT 0,
	`duration_ms` integer NOT NULL DEFAULT 0,
	`is_completed` integer NOT NULL DEFAULT 0,
	`updated_at` text NOT NULL,
	`needs_sync` integer NOT NULL DEFAULT 0
);--> statement-breakpoint
CREATE INDEX `playback_progress_needs_sync_idx` ON `playback_progress` (`needs_sync`);
