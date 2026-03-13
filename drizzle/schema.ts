import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  
  // Période d'essai
  trialStartDate: bigint("trialStartDate", { mode: "number" }),
  trialEndDate: bigint("trialEndDate", { mode: "number" }),
  photoCount: int("photoCount").default(0).notNull(),
  
  // Abonnement
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["trial", "active", "cancelled", "expired"]).default("trial").notNull(),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["monthly", "yearly", "lifetime"]),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionEndDate: bigint("subscriptionEndDate", { mode: "number" }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== SYNCHRONISATION DES DONNÉES ====================

/**
 * Table des catégories (NON CLASSEE, MES PROJETS, etc.)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contentType: mysqlEnum("contentType", ["photos", "documents"]).default("photos").notNull(),
  icon: varchar("icon", { length: 32 }),
  color: varchar("color", { length: 7 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isSystem: boolean("isSystem").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Table des albums
 */
export const albums = mysqlTable("albums", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  categoryLocalId: varchar("categoryLocalId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  contentType: mysqlEnum("contentType", ["photos", "documents"]).default("photos").notNull(),
  coverPhotoLocalId: varchar("coverPhotoLocalId", { length: 64 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  photoCount: int("photoCount").default(0).notNull(),
  isSystem: boolean("isSystem").default(false).notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  privatePassword: varchar("privatePassword", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;

/**
 * Table des métadonnées des photos/documents
 */
export const photoMetadata = mysqlTable("photoMetadata", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  albumLocalId: varchar("albumLocalId", { length: 64 }),
  fileName: varchar("fileName", { length: 255 }),
  mediaType: mysqlEnum("mediaType", ["photo", "video", "document"]).default("photo").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: bigint("fileSize", { mode: "number" }),
  width: int("width"),
  height: int("height"),
  fileHash: varchar("fileHash", { length: 64 }),
  
  // Position et affichage
  position: int("position").default(0).notNull(),
  rotation: int("rotation").default(0).notNull(),
  cropData: text("cropData"),
  scale: float("scale").default(1),
  
  // Métadonnées descriptives
  title: varchar("title", { length: 255 }),
  caption: text("caption"),
  tags: text("tags"),
  rating: int("rating"),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  
  // Métadonnées EXIF
  dateTaken: timestamp("dateTaken"),
  gpsLatitude: float("gpsLatitude"),
  gpsLongitude: float("gpsLongitude"),
  cameraModel: varchar("cameraModel", { length: 128 }),
  
  // Miniature S3
  thumbnailUrl: varchar("thumbnailUrl", { length: 512 }),
  thumbnailKey: varchar("thumbnailKey", { length: 255 }),
  
  // Statut
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type PhotoMetadata = typeof photoMetadata.$inferSelect;
export type InsertPhotoMetadata = typeof photoMetadata.$inferInsert;

/**
 * Table des paramètres utilisateur synchronisés
 */
export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  displayMode: varchar("displayMode", { length: 32 }).default("normal"),
  thumbnailSize: int("thumbnailSize").default(150),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  syncTimestamp: bigint("syncTimestamp", { mode: "number" }),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

/**
 * Table de suivi de la synchronisation
 */
export const syncLog = mysqlTable("syncLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["category", "album", "photo", "settings"]).notNull(),
  entityLocalId: varchar("entityLocalId", { length: 64 }).notNull(),
  action: mysqlEnum("action", ["create", "update", "delete"]).notNull(),
  previousData: text("previousData"),
  newData: text("newData"),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

// ==================== GESTION DES LICENCES ====================

/**
 * Table des licences (achat unique 49€)
 */
export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  licenseCode: varchar("licenseCode", { length: 32 }).notNull().unique(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  deviceName: varchar("deviceName", { length: 255 }),
  licenseType: mysqlEnum("licenseType", ["monthly", "yearly", "lifetime"]).default("lifetime").notNull(),
  status: mysqlEnum("status", ["pending", "active", "expired", "revoked", "transferred"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  transferCount: int("transferCount").default(0).notNull(),
  maxTransfers: int("maxTransfers").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

/**
 * Historique des activations/transferts de licence
 */
export const licenseHistory = mysqlTable("licenseHistory", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  eventType: mysqlEnum("eventType", ["created", "activated", "deactivated", "transferred", "expired", "revoked"]).notNull(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  deviceName: varchar("deviceName", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseHistory = typeof licenseHistory.$inferSelect;
export type InsertLicenseHistory = typeof licenseHistory.$inferInsert;
