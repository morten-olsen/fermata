CREATE TABLE `offline_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`source_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `offline_pins_unique` ON `offline_pins` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `offline_pins_source_idx` ON `offline_pins` (`source_id`);--> statement-breakpoint
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
);--> statement-breakpoint
CREATE INDEX `downloads_status_idx` ON `downloads` (`status`);--> statement-breakpoint
CREATE INDEX `downloads_source_idx` ON `downloads` (`source_id`);
