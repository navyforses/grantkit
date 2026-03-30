CREATE TABLE `saved_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`grantId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_grant_idx` UNIQUE(`userId`,`grantId`)
);
