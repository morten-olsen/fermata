CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`title` text NOT NULL,
	`artist_name` text NOT NULL,
	`year` integer,
	`artwork_source_item_id` text,
	`track_count` integer,
	`media_type` text DEFAULT 'music' NOT NULL,
	`is_favourite` integer DEFAULT 0,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_source_unique` ON `albums` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `albums_artist_idx` ON `albums` (`artist_name`);--> statement-breakpoint
CREATE INDEX `albums_title_idx` ON `albums` (`title`);--> statement-breakpoint
CREATE INDEX `albums_media_type_idx` ON `albums` (`media_type`);--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`name` text NOT NULL,
	`artwork_source_item_id` text,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_source_unique` ON `artists` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `artists_name_idx` ON `artists` (`name`);--> statement-breakpoint
CREATE TABLE `downloads` (
	`track_id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`status` text NOT NULL,
	`file_path` text,
	`file_size` integer,
	`downloaded_at` text,
	`synced_at` text,
	`error_message` text,
	`retry_count` integer DEFAULT 0,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `downloads_status_idx` ON `downloads` (`status`);--> statement-breakpoint
CREATE INDEX `downloads_source_idx` ON `downloads` (`source_id`);--> statement-breakpoint
CREATE TABLE `offline_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`source_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offline_pins_unique` ON `offline_pins` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `offline_pins_source_idx` ON `offline_pins` (`source_id`);--> statement-breakpoint
CREATE TABLE `output_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playback_progress` (
	`track_id` text PRIMARY KEY NOT NULL,
	`position_ms` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`is_completed` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`needs_sync` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playback_progress_needs_sync_idx` ON `playback_progress` (`needs_sync`);--> statement-breakpoint
CREATE TABLE `playlist_tracks` (
	`playlist_id` text NOT NULL,
	`track_id` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` text NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_tracks_unique` ON `playlist_tracks` (`playlist_id`,`track_id`);--> statement-breakpoint
CREATE INDEX `playlist_tracks_playlist_idx` ON `playlist_tracks` (`playlist_id`);--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_source_unique` ON `playlists` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `playlists_name_idx` ON `playlists` (`name`);--> statement-breakpoint
CREATE INDEX `playlists_mix_tape_idx` ON `playlists` (`is_mix_tape`);--> statement-breakpoint
CREATE INDEX `playlists_needs_sync_idx` ON `playlists` (`needs_sync`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`user_id` text,
	`access_token` text,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`title` text NOT NULL,
	`artist_name` text NOT NULL,
	`album_title` text NOT NULL,
	`album_id` text,
	`duration` real NOT NULL,
	`track_number` integer,
	`disc_number` integer,
	`is_favourite` integer DEFAULT 0,
	`media_type` text DEFAULT 'music' NOT NULL,
	`description` text,
	`published_at` text,
	`episode_number` integer,
	`content_url` text,
	`chapter_start_ms` integer,
	`artwork_source_item_id` text,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_source_unique` ON `tracks` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `tracks_album_idx` ON `tracks` (`album_id`);--> statement-breakpoint
CREATE INDEX `tracks_artist_idx` ON `tracks` (`artist_name`);--> statement-breakpoint
CREATE INDEX `tracks_title_idx` ON `tracks` (`title`);--> statement-breakpoint
CREATE INDEX `tracks_media_type_idx` ON `tracks` (`media_type`);--> statement-breakpoint
CREATE INDEX `tracks_published_at_idx` ON `tracks` (`published_at`);