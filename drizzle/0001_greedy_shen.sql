CREATE TABLE `csv_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`csv_id` integer NOT NULL,
	`email` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`csv_id`) REFERENCES `csv_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `csv_records_email_unique` ON `csv_records` (`email`);--> statement-breakpoint
CREATE TABLE `csv_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`r2_key` text NOT NULL,
	`status` text DEFAULT 'pending',
	`progress` integer DEFAULT 0
);
--> statement-breakpoint
DROP TABLE `data`;