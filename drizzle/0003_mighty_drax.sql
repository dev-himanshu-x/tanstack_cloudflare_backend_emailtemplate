ALTER TABLE `csv_records` ADD `Name` text;--> statement-breakpoint
ALTER TABLE `csv_records` ADD `dial_code` integer;--> statement-breakpoint
ALTER TABLE `csv_records` ADD `phone_number` integer;--> statement-breakpoint
ALTER TABLE `csv_records` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `csv_records` DROP COLUMN `data`;