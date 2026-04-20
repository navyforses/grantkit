CREATE TABLE `organization_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` varchar(24) NOT NULL,
	`orgId` varchar(16) NOT NULL,
	`branchType` enum('HQ','Branch') NOT NULL,
	`country` varchar(8) NOT NULL,
	`state` varchar(128),
	`city` varchar(128),
	`address` varchar(500),
	`phone` varchar(128),
	`email` varchar(320),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`source` varchar(64),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_branches_branchId_unique` UNIQUE(`branchId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` varchar(16) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`country` varchar(8) NOT NULL,
	`state` varchar(128),
	`city` varchar(128),
	`hqAddress` varchar(500),
	`website` text,
	`phone` varchar(128),
	`email` varchar(320),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`programsCount` int NOT NULL DEFAULT 0,
	`branchesCount` int NOT NULL DEFAULT 1,
	`categories` text,
	`serviceArea` varchar(255),
	`officeHours` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_orgId_unique` UNIQUE(`orgId`)
);
--> statement-breakpoint
CREATE INDEX `branches_org_idx` ON `organization_branches` (`orgId`);--> statement-breakpoint
CREATE INDEX `branches_country_idx` ON `organization_branches` (`country`);--> statement-breakpoint
CREATE INDEX `branches_lat_lng_idx` ON `organization_branches` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `orgs_country_idx` ON `organizations` (`country`);--> statement-breakpoint
CREATE INDEX `orgs_lat_lng_idx` ON `organizations` (`latitude`,`longitude`);