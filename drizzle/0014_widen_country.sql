ALTER TABLE `organizations` MODIFY `country` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_branches` MODIFY `country` varchar(64) NOT NULL;
