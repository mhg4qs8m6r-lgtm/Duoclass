CREATE TABLE `albums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`localId` varchar(64) NOT NULL,
	`categoryLocalId` varchar(64),
	`name` varchar(255) NOT NULL,
	`description` text,
	`contentType` enum('photos','documents') NOT NULL DEFAULT 'photos',
	`coverPhotoLocalId` varchar(64),
	`sortOrder` int NOT NULL DEFAULT 0,
	`photoCount` int NOT NULL DEFAULT 0,
	`isSystem` boolean NOT NULL DEFAULT false,
	`isPrivate` boolean NOT NULL DEFAULT false,
	`privatePassword` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncTimestamp` bigint,
	CONSTRAINT `albums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`localId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`contentType` enum('photos','documents') NOT NULL DEFAULT 'photos',
	`icon` varchar(32),
	`color` varchar(7),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isSystem` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncTimestamp` bigint,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licenseHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`eventType` enum('created','activated','deactivated','transferred','expired','revoked') NOT NULL,
	`deviceFingerprint` varchar(128),
	`deviceName` varchar(255),
	`ipAddress` varchar(45),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `licenseHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseCode` varchar(32) NOT NULL,
	`userId` int,
	`email` varchar(320),
	`deviceFingerprint` varchar(128),
	`deviceName` varchar(255),
	`licenseType` enum('monthly','yearly','lifetime') NOT NULL DEFAULT 'lifetime',
	`status` enum('pending','active','expired','revoked','transferred') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`transferCount` int NOT NULL DEFAULT 0,
	`maxTransfers` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `licenses_licenseCode_unique` UNIQUE(`licenseCode`)
);
--> statement-breakpoint
CREATE TABLE `photoMetadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`localId` varchar(64) NOT NULL,
	`albumLocalId` varchar(64),
	`fileName` varchar(255),
	`mediaType` enum('photo','video','document') NOT NULL DEFAULT 'photo',
	`mimeType` varchar(128),
	`fileSize` bigint,
	`width` int,
	`height` int,
	`fileHash` varchar(64),
	`position` int NOT NULL DEFAULT 0,
	`rotation` int NOT NULL DEFAULT 0,
	`cropData` text,
	`scale` float DEFAULT 1,
	`title` varchar(255),
	`caption` text,
	`tags` text,
	`rating` int,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`dateTaken` timestamp,
	`gpsLatitude` float,
	`gpsLongitude` float,
	`cameraModel` varchar(128),
	`thumbnailUrl` varchar(512),
	`thumbnailKey` varchar(255),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncTimestamp` bigint,
	CONSTRAINT `photoMetadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `syncLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('category','album','photo','settings') NOT NULL,
	`entityLocalId` varchar(64) NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`previousData` text,
	`newData` text,
	`deviceFingerprint` varchar(128),
	`timestamp` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayMode` varchar(32) DEFAULT 'normal',
	`thumbnailSize` int DEFAULT 150,
	`themeColor` varchar(7) DEFAULT '#2563eb',
	`backgroundTexture` varchar(64),
	`language` varchar(5) DEFAULT 'fr',
	`defaultPhotoSort` varchar(32) DEFAULT 'date',
	`defaultSortOrder` varchar(4) DEFAULT 'desc',
	`autoCreateThumbnails` boolean DEFAULT true,
	`detectDuplicates` boolean DEFAULT true,
	`readExifData` boolean DEFAULT true,
	`additionalSettings` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncTimestamp` bigint,
	CONSTRAINT `userSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `trialStartDate` bigint;--> statement-breakpoint
ALTER TABLE `users` ADD `trialEndDate` bigint;--> statement-breakpoint
ALTER TABLE `users` ADD `photoCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('trial','active','cancelled','expired') DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlan` enum('monthly','yearly','lifetime');--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionEndDate` bigint;