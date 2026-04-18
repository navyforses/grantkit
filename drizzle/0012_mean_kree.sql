ALTER TABLE `grants` ADD `address` varchar(500);--> statement-breakpoint
ALTER TABLE `grants` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `grants` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `grants` ADD `serviceArea` varchar(100);--> statement-breakpoint
ALTER TABLE `grants` ADD `officeHours` varchar(200);--> statement-breakpoint
ALTER TABLE `grants` ADD `geocodedAt` timestamp;--> statement-breakpoint
CREATE INDEX `grants_lat_lng_idx` ON `grants` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `grants_service_area_idx` ON `grants` (`serviceArea`);