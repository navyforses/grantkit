ALTER TABLE `users` ADD `paddleCustomerId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `paddleSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('none','active','cancelled','past_due','paused') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlanId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionCurrentPeriodEnd` timestamp;