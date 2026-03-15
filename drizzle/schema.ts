import { integer, pgEnum, pgTable, text, timestamp, varchar, bigint, boolean, real, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 32 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  trialStartDate: bigint("trialStartDate", { mode: "number" }),
  trialEndDate: bigint("trialEndDate", { mode: "number" }),
  photoCount: integer("photoCount").default(0).notNull(),
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }).default("trial").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 32 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionEndDate: bigint("subscriptionEndDate", { mode: "number" }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 32 }).default("photos").notNull(),
  icon: varchar("icon", { length: 32 }),
  color: varchar("color", { length: 7 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isSystem: boolean("isSystem").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  categoryLocalId: varchar("categoryLocalId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  contentType: varchar("contentType", { length: 32 }).default("photos").notNull(),
  coverPhotoLocalId: varchar("coverPhotoLocalId", { length: 64 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  photoCount: integer("photoCount").default(0).notNull(),
  isSystem: boolean("isSystem").default(false).notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  privatePassword: varchar("privatePassword", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;

export const photoMetadata = pgTable("photoMetadata", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  albumLocalId: varchar("albumLocalId", { length: 64 }),
  fileName: varchar("fileName", { length: 255 }),
  mediaType: varchar("mediaType", { length: 32 }).default("photo").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: bigint("fileSize", { mode: "number" }),
  width: integer("width"),
  height: integer("height"),
  fileHash: varchar("fileHash", { length: 64 }),
  position: integer("position").default(0).notNull(),
  rotation: integer("rotation").default(0).notNull(),
  cropData: text("cropData"),
  scale: real("scale").default(1),
  title: varchar("title", { length: 255 }),
  caption: text("caption"),
  tags: text("tags"),
  rating: integer("rating"),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  dateTaken: timestamp("dateTaken"),
  gpsLatitude: real("gpsLatitude"),
  gpsLongitude: real("gpsLongitude"),
  cameraModel: varchar("cameraModel", { length: 128 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 512 }),
  thumbnailKey: varchar("thumbnailKey", { length: 255 }),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type PhotoMetadata = typeof photoMetadata.$inferSelect;
export type InsertPhotoMetadata = typeof photoMetadata.$inferInsert;

export const userSettings = pgTable("userSettings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  displayMode: varchar("displayMode", { length: 32 }).default("normal"),
  thumbnailSize: integer("thumbnailSize").default(150),
  themeColor: varchar("themeColor", { length: 7 }).default("#2563eb"),
  backgroundTexture: varchar("backgroundTexture", { length: 64 }),
  language: varchar("language", { length: 5 }).default("fr"),
  defaultPhotoSort: varchar("defaultPhotoSort", { length: 32 }).default("date"),
  defaultSortOrder: varchar("defaultSortOrder", { length: 4 }).default("desc"),
  autoCreateThumbnails: boolean("autoCreateThumbnails").default(true),
  detectDuplicates: boolean("detectDuplicates").default(true),
  readExifData: boolean("readExifData").default(true),
  additionalSettings: text("additionalSettings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

export const syncLog = pgTable("syncLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityType: varchar("entityType", { length: 32 }).notNull(),
  entityLocalId: varchar("entityLocalId", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  previousData: text("previousData"),
  newData: text("newData"),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  licenseCode: varchar("licenseCode", { length: 32 }).notNull().unique(),
  userId: integer("userId"),
  email: varchar("email", { length: 320 }),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  deviceName: varchar("deviceName", { length: 255 }),
  licenseType: varchar("licenseType", { length: 32 }).default("lifetime").notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  transferCount: integer("transferCount").default(0).notNull(),
  maxTransfers: integer("maxTransfers").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

export const licenseHistory = pgTable("licenseHistory", {
  id: serial("id").primaryKey(),
  licenseId: integer("licenseId").notNull(),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  deviceName: varchar("deviceName", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseHistory = typeof licenseHistory.$inferSelect;
export type InsertLicenseHistory = typeof licenseHistory.$inferInsert;
