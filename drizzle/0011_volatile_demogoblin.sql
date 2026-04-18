ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationToken` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `verificationTokenExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `resetPasswordToken` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `resetPasswordTokenExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `failedLoginAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lockedUntil` timestamp;--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_verification_token_idx` ON `users` (`verificationToken`);--> statement-breakpoint
CREATE INDEX `users_reset_token_idx` ON `users` (`resetPasswordToken`);