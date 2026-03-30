CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`title` text NOT NULL,
	`artist_name` text NOT NULL,
	`year` integer,
	`artwork_source_item_id` text,
	`track_count` integer,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_source_unique` ON `albums` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `albums_artist_idx` ON `albums` (`artist_name`);--> statement-breakpoint
CREATE INDEX `albums_title_idx` ON `albums` (`title`);--> statement-breakpoint
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
CREATE TABLE `mix_tape_tracks` (
	`mix_tape_id` text NOT NULL,
	`track_id` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` text NOT NULL,
	FOREIGN KEY (`mix_tape_id`) REFERENCES `mix_tapes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mix_tape_tracks_unique` ON `mix_tape_tracks` (`mix_tape_id`,`track_id`);--> statement-breakpoint
CREATE INDEX `mix_tape_tracks_tape_idx` ON `mix_tape_tracks` (`mix_tape_id`);--> statement-breakpoint
CREATE TABLE `mix_tapes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
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
	`synced_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_source_unique` ON `tracks` (`source_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `tracks_album_idx` ON `tracks` (`album_id`);--> statement-breakpoint
CREATE INDEX `tracks_artist_idx` ON `tracks` (`artist_name`);--> statement-breakpoint
CREATE INDEX `tracks_title_idx` ON `tracks` (`title`);