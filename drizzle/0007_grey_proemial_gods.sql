ALTER TABLE `grants` ADD `state` varchar(128);--> statement-breakpoint
ALTER TABLE `grants` ADD `city` varchar(128);--> statement-breakpoint
CREATE INDEX `grants_state_idx` ON `grants` (`state`);