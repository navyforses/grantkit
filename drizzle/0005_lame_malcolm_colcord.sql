CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` text NOT NULL,
	`grantItemIds` text NOT NULL,
	`recipientCount` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failCount` int NOT NULL DEFAULT 0,
	`notifStatus` enum('sending','completed','failed') NOT NULL DEFAULT 'sending',
	`sentBy` int,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
