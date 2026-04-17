CREATE TABLE `grant_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantItemId` varchar(64) NOT NULL,
	`language` varchar(10) NOT NULL,
	`name` text,
	`description` text,
	`eligibility` text,
	CONSTRAINT `grant_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `grant_lang_idx` UNIQUE(`grantItemId`,`language`)
);
--> statement-breakpoint
CREATE TABLE `grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`organization` text,
	`description` text,
	`category` varchar(64) NOT NULL,
	`grantType` enum('grant','resource') NOT NULL DEFAULT 'grant',
	`country` varchar(64) NOT NULL,
	`eligibility` text,
	`website` text,
	`phone` varchar(128),
	`grantEmail` varchar(320),
	`amount` text,
	`status` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `grants_itemId_unique` UNIQUE(`itemId`)
);
--> statement-breakpoint
CREATE INDEX `grant_translations_lang_idx` ON `grant_translations` (`language`);--> statement-breakpoint
CREATE INDEX `grants_category_idx` ON `grants` (`category`);--> statement-breakpoint
CREATE INDEX `grants_country_idx` ON `grants` (`country`);--> statement-breakpoint
CREATE INDEX `grants_type_idx` ON `grants` (`grantType`);