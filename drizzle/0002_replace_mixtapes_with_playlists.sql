-- Create new playlists table
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`source_item_id` text,
	`name` text NOT NULL,
	`description` text,
	`is_mix_tape` integer DEFAULT 0,
	`artwork_source_item_id` text,
	`track_count` integer DEFAULT 0,
	`needs_sync` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_source_unique` ON `playlists` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `playlists_name_idx` ON `playlists` (`name`);--> statement-breakpoint
CREATE INDEX `playlists_mix_tape_idx` ON `playlists` (`is_mix_tape`);--> statement-breakpoint
CREATE INDEX `playlists_needs_sync_idx` ON `playlists` (`needs_sync`);--> statement-breakpoint

-- Create new playlist_tracks table
CREATE TABLE `playlist_tracks` (
	`playlist_id` text NOT NULL,
	`track_id` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` text NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_tracks_unique` ON `playlist_tracks` (`playlist_id`,`track_id`);--> statement-breakpoint
CREATE INDEX `playlist_tracks_playlist_idx` ON `playlist_tracks` (`playlist_id`);--> statement-breakpoint

-- Migrate existing mix tapes → playlists (local-only, pinned as mix tapes)
INSERT INTO `playlists` (`id`, `source_id`, `source_item_id`, `name`, `is_mix_tape`, `track_count`, `needs_sync`, `created_at`, `updated_at`, `synced_at`)
SELECT `id`, NULL, NULL, `name`, 1, (SELECT count(*) FROM `mix_tape_tracks` WHERE `mix_tape_id` = `mix_tapes`.`id`), 0, `created_at`, `updated_at`, NULL
FROM `mix_tapes`;--> statement-breakpoint

-- Migrate mix tape track associations
INSERT INTO `playlist_tracks` (`playlist_id`, `track_id`, `position`, `added_at`)
SELECT `mix_tape_id`, `track_id`, `position`, `added_at`
FROM `mix_tape_tracks`;--> statement-breakpoint

-- Drop old tables
DROP TABLE `mix_tape_tracks`;--> statement-breakpoint
DROP TABLE `mix_tapes`;
