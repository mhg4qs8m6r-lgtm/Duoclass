import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  email: text("email").notNull().unique(),
  loginMethod: text("loginMethod"),
  role: text("role").default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  passwordHash: text("passwordHash").notNull(),
  trialStartDate: integer("trialStartDate"),
  trialEndDate: integer("trialEndDate"),
  photoCount: integer("photoCount").default(0).notNull(),
  subscriptionStatus: text("subscriptionStatus").default("trial").notNull(),
  subscriptionPlan: text("subscriptionPlan"),
  subscriptionEndDate: integer("subscriptionEndDate"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  localId: text("localId").notNull(),
  name: text("name").notNull(),
  contentType: text("contentType").default("photos").notNull(),
  icon: text("icon"),
  color: text("color"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isSystem: integer("isSystem", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncTimestamp: integer("syncTimestamp"),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const albums = sqliteTable("albums", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  localId: text("localId").notNull(),
  categoryLocalId: text("categoryLocalId"),
  name: text("name").notNull(),
  description: text("description"),
  contentType: text("contentType").default("photos").notNull(),
  coverPhotoLocalId: text("coverPhotoLocalId"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  photoCount: integer("photoCount").default(0).notNull(),
  isSystem: integer("isSystem", { mode: "boolean" }).default(false).notNull(),
  isPrivate: integer("isPrivate", { mode: "boolean" }).default(false).notNull(),
  privatePassword: text("privatePassword"),
  framesData: text("framesData"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncTimestamp: integer("syncTimestamp"),
});

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;

export const photoMetadata = sqliteTable("photoMetadata", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  localId: text("localId").notNull(),
  albumLocalId: text("albumLocalId"),
  fileName: text("fileName"),
  mediaType: text("mediaType").default("photo").notNull(),
  mimeType: text("mimeType"),
  fileSize: integer("fileSize"),
  width: integer("width"),
  height: integer("height"),
  fileHash: text("fileHash"),
  position: integer("position").default(0).notNull(),
  rotation: integer("rotation").default(0).notNull(),
  cropData: text("cropData"),
  scale: real("scale").default(1),
  title: text("title"),
  caption: text("caption"),
  tags: text("tags"),
  rating: integer("rating"),
  isFavorite: integer("isFavorite", { mode: "boolean" }).default(false).notNull(),
  dateTaken: integer("dateTaken", { mode: "timestamp" }),
  gpsLatitude: real("gpsLatitude"),
  gpsLongitude: real("gpsLongitude"),
  cameraModel: text("cameraModel"),
  thumbnailUrl: text("thumbnailUrl"),
  thumbnailKey: text("thumbnailKey"),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false).notNull(),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncTimestamp: integer("syncTimestamp"),
});

export type PhotoMetadata = typeof photoMetadata.$inferSelect;
export type InsertPhotoMetadata = typeof photoMetadata.$inferInsert;

export const userSettings = sqliteTable("userSettings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  displayMode: text("displayMode").default("normal"),
  thumbnailSize: integer("thumbnailSize").default(150),
  themeColor: text("themeColor").default("#2563eb"),
  backgroundTexture: text("backgroundTexture"),
  language: text("language").default("fr"),
  defaultPhotoSort: text("defaultPhotoSort").default("date"),
  defaultSortOrder: text("defaultSortOrder").default("desc"),
  autoCreateThumbnails: integer("autoCreateThumbnails", { mode: "boolean" }).default(true),
  detectDuplicates: integer("detectDuplicates", { mode: "boolean" }).default(true),
  readExifData: integer("readExifData", { mode: "boolean" }).default(true),
  additionalSettings: text("additionalSettings"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncTimestamp: integer("syncTimestamp"),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  localId: text("localId").notNull(),
  name: text("name").notNull(),
  canvasElements: text("canvasElements"),
  canvasData: text("canvasData"),
  photos: text("photos"),
  canvasFormat: text("canvasFormat"),
  canvasFormatWidth: integer("canvasFormatWidth"),
  canvasFormatHeight: integer("canvasFormatHeight"),
  thumbnail: text("thumbnail"),
  projectType: text("projectType"),
  projectCategory: text("projectCategory"),
  collecteurData: text("collecteurData"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncTimestamp: integer("syncTimestamp"),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const projectVersions = sqliteTable("projectVersions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("projectId").notNull(),
  userId: integer("userId").notNull(),
  localId: text("localId").notNull(),
  name: text("name"),
  canvasElements: text("canvasElements"),
  canvasData: text("canvasData"),
  photos: text("photos"),
  canvasFormat: text("canvasFormat"),
  canvasFormatWidth: integer("canvasFormatWidth"),
  canvasFormatHeight: integer("canvasFormatHeight"),
  thumbnail: text("thumbnail"),
  projectType: text("projectType"),
  projectCategory: text("projectCategory"),
  collecteurData: text("collecteurData"),
  savedAt: integer("savedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

export const bibliothequeItems = sqliteTable("bibliothequeItems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  localId: text("localId").notNull(),
  category: text("category").notNull(),
  type: text("type"),
  name: text("name").notNull(),
  url: text("url"),
  thumbnail: text("thumbnail"),
  fullImage: text("fullImage"),
  sourcePhotoId: text("sourcePhotoId"),
  addedAt: integer("addedAt"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncTimestamp: integer("syncTimestamp"),
});

export type BibliothequeItem = typeof bibliothequeItems.$inferSelect;
export type InsertBibliothequeItem = typeof bibliothequeItems.$inferInsert;

export const syncLog = sqliteTable("syncLog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  entityType: text("entityType").notNull(),
  entityLocalId: text("entityLocalId").notNull(),
  action: text("action").notNull(),
  previousData: text("previousData"),
  newData: text("newData"),
  deviceFingerprint: text("deviceFingerprint"),
  timestamp: integer("timestamp").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type SyncLog = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

export const licenses = sqliteTable("licenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  licenseCode: text("licenseCode").notNull().unique(),
  userId: integer("userId"),
  email: text("email"),
  deviceFingerprint: text("deviceFingerprint"),
  deviceName: text("deviceName"),
  licenseType: text("licenseType").default("lifetime").notNull(),
  status: text("status").default("pending").notNull(),
  activatedAt: integer("activatedAt", { mode: "timestamp" }),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  transferCount: integer("transferCount").default(0).notNull(),
  maxTransfers: integer("maxTransfers").default(3).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

export const licenseHistory = sqliteTable("licenseHistory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  licenseId: integer("licenseId").notNull(),
  eventType: text("eventType").notNull(),
  deviceFingerprint: text("deviceFingerprint"),
  deviceName: text("deviceName"),
  ipAddress: text("ipAddress"),
  details: text("details"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type LicenseHistory = typeof licenseHistory.$inferSelect;
export type InsertLicenseHistory = typeof licenseHistory.$inferInsert;

export const passwordResetTokens = sqliteTable("passwordResetTokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  usedAt: integer("usedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ==================== MODÈLES PARTAGÉS ====================

export const sharedModeles = sqliteTable("sharedModeles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), // "passe-partout" | "pele-mele"
  filename: text("filename").notNull(),
  imageData: text("imageData").notNull(), // base64 data URL
  uploadedBy: integer("uploadedBy").notNull(),
  slotsJson: text("slotsJson"),           // JSON sérialisé PeleMelePaperState (pêle-mêle uniquement)
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type SharedModele = typeof sharedModeles.$inferSelect;
export type InsertSharedModele = typeof sharedModeles.$inferInsert;

// ==================== ADRESSES UTILES ====================

export const usefulLinks = sqliteTable("usefulLinks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  url: text("url").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  ordre: integer("ordre").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type UsefulLink = typeof usefulLinks.$inferSelect;
export type InsertUsefulLink = typeof usefulLinks.$inferInsert;
