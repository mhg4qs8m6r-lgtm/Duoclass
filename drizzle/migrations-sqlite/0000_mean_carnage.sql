CREATE TABLE `albums` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`localId` text NOT NULL,
	`categoryLocalId` text,
	`name` text NOT NULL,
	`description` text,
	`contentType` text DEFAULT 'photos' NOT NULL,
	`coverPhotoLocalId` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`photoCount` integer DEFAULT 0 NOT NULL,
	`isSystem` integer DEFAULT false NOT NULL,
	`isPrivate` integer DEFAULT false NOT NULL,
	`privatePassword` text,
	`framesData` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`syncTimestamp` integer
);
--> statement-breakpoint
CREATE TABLE `bibliothequeItems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`localId` text NOT NULL,
	`category` text NOT NULL,
	`type` text,
	`name` text NOT NULL,
	`url` text,
	`thumbnail` text,
	`fullImage` text,
	`sourcePhotoId` text,
	`addedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`syncTimestamp` integer
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`localId` text NOT NULL,
	`name` text NOT NULL,
	`contentType` text DEFAULT 'photos' NOT NULL,
	`icon` text,
	`color` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`isSystem` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`syncTimestamp` integer
);
--> statement-breakpoint
CREATE TABLE `licenseHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licenseId` integer NOT NULL,
	`eventType` text NOT NULL,
	`deviceFingerprint` text,
	`deviceName` text,
	`ipAddress` text,
	`details` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licenseCode` text NOT NULL,
	`userId` integer,
	`email` text,
	`deviceFingerprint` text,
	`deviceName` text,
	`licenseType` text DEFAULT 'lifetime' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`activatedAt` integer,
	`expiresAt` integer,
	`transferCount` integer DEFAULT 0 NOT NULL,
	`maxTransfers` integer DEFAULT 3 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_licenseCode_unique` ON `licenses` (`licenseCode`);--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`usedAt` integer,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passwordResetTokens_token_unique` ON `passwordResetTokens` (`token`);--> statement-breakpoint
CREATE TABLE `photoMetadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`localId` text NOT NULL,
	`albumLocalId` text,
	`fileName` text,
	`mediaType` text DEFAULT 'photo' NOT NULL,
	`mimeType` text,
	`fileSize` integer,
	`width` integer,
	`height` integer,
	`fileHash` text,
	`position` integer DEFAULT 0 NOT NULL,
	`rotation` integer DEFAULT 0 NOT NULL,
	`cropData` text,
	`scale` real DEFAULT 1,
	`title` text,
	`caption` text,
	`tags` text,
	`rating` integer,
	`isFavorite` integer DEFAULT false NOT NULL,
	`dateTaken` integer,
	`gpsLatitude` real,
	`gpsLongitude` real,
	`cameraModel` text,
	`thumbnailUrl` text,
	`thumbnailKey` text,
	`isDeleted` integer DEFAULT false NOT NULL,
	`deletedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`syncTimestamp` integer
);
--> statement-breakpoint
CREATE TABLE `projectVersions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`userId` integer NOT NULL,
	`localId` text NOT NULL,
	`name` text,
	`canvasElements` text,
	`canvasData` text,
	`photos` text,
	`canvasFormat` text,
	`canvasFormatWidth` integer,
	`canvasFormatHeight` integer,
	`thumbnail` text,
	`projectType` text,
	`projectCategory` text,
	`collecteurData` text,
	`savedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`localId` text NOT NULL,
	`name` text NOT NULL,
	`canvasElements` text,
	`canvasData` text,
	`photos` text,
	`canvasFormat` text,
	`canvasFormatWidth` integer,
	`canvasFormatHeight` integer,
	`thumbnail` text,
	`projectType` text,
	`projectCategory` text,
	`collecteurData` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`syncTimestamp` integer
);
--> statement-breakpoint
CREATE TABLE `sharedModeles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`imageData` text NOT NULL,
	`uploadedBy` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `syncLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`entityType` text NOT NULL,
	`entityLocalId` text NOT NULL,
	`action` text NOT NULL,
	`previousData` text,
	`newData` text,
	`deviceFingerprint` text,
	`timestamp` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usefulLinks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `userSettings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`displayMode` text DEFAULT 'normal',
	`thumbnailSize` integer DEFAULT 150,
	`themeColor` text DEFAULT '#2563eb',
	`backgroundTexture` text,
	`language` text DEFAULT 'fr',
	`defaultPhotoSort` text DEFAULT 'date',
	`defaultSortOrder` text DEFAULT 'desc',
	`autoCreateThumbnails` integer DEFAULT true,
	`detectDuplicates` integer DEFAULT true,
	`readExifData` integer DEFAULT true,
	`additionalSettings` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`syncTimestamp` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `userSettings_userId_unique` ON `userSettings` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL,
	`passwordHash` text NOT NULL,
	`trialStartDate` integer,
	`trialEndDate` integer,
	`photoCount` integer DEFAULT 0 NOT NULL,
	`subscriptionStatus` text DEFAULT 'trial' NOT NULL,
	`subscriptionPlan` text,
	`subscriptionEndDate` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);