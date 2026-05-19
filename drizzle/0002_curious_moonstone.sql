PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_csv_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`csv_id` integer NOT NULL,
	`email` text,
	`data` text NOT NULL,
	FOREIGN KEY (`csv_id`) REFERENCES `csv_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_csv_records`("id", "csv_id", "email", "data") SELECT "id", "csv_id", "email", "data" FROM `csv_records`;--> statement-breakpoint
DROP TABLE `csv_records`;--> statement-breakpoint
ALTER TABLE `__new_csv_records` RENAME TO `csv_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;