var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import { integer, pgTable, text, timestamp, varchar, bigint, boolean, real, serial } from "drizzle-orm/pg-core";
var users, categories, albums, photoMetadata, userSettings, syncLog, licenses, licenseHistory;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = pgTable("users", {
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
      subscriptionEndDate: bigint("subscriptionEndDate", { mode: "number" })
    });
    categories = pgTable("categories", {
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
      syncTimestamp: bigint("syncTimestamp", { mode: "number" })
    });
    albums = pgTable("albums", {
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
      syncTimestamp: bigint("syncTimestamp", { mode: "number" })
    });
    photoMetadata = pgTable("photoMetadata", {
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
      syncTimestamp: bigint("syncTimestamp", { mode: "number" })
    });
    userSettings = pgTable("userSettings", {
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
      syncTimestamp: bigint("syncTimestamp", { mode: "number" })
    });
    syncLog = pgTable("syncLog", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      entityType: varchar("entityType", { length: 32 }).notNull(),
      entityLocalId: varchar("entityLocalId", { length: 64 }).notNull(),
      action: varchar("action", { length: 32 }).notNull(),
      previousData: text("previousData"),
      newData: text("newData"),
      deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
      timestamp: bigint("timestamp", { mode: "number" }).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    licenses = pgTable("licenses", {
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
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    licenseHistory = pgTable("licenseHistory", {
      id: serial("id").primaryKey(),
      licenseId: integer("licenseId").notNull(),
      eventType: varchar("eventType", { length: 32 }).notNull(),
      deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
      deviceName: varchar("deviceName", { length: 255 }),
      ipAddress: varchar("ipAddress", { length: 45 }),
      details: text("details"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function createUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [user] = await db.insert(users).values({
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: data.loginMethod,
    role: data.role ?? "user",
    lastSignedIn: /* @__PURE__ */ new Date()
  }).returning();
  return user;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}
async function updateLastSignedIn(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    _db = null;
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
async function buildDownloadUrl(baseUrl, relKey, apiKey) {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey)
  });
  return (await response.json()).url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
async function storageGet(relKey) {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey)
  };
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/license-db.ts
var license_db_exports = {};
__export(license_db_exports, {
  activateLicense: () => activateLicense,
  createLicense: () => createLicense,
  getAllLicenses: () => getAllLicenses,
  getLicenseHistory: () => getLicenseHistory,
  getUserLicense: () => getUserLicense,
  updateLicenseStatus: () => updateLicenseStatus,
  validateLicense: () => validateLicense
});
import { eq as eq3, and as and2 } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
function generateLicenseCode() {
  const uuid = uuidv4().toUpperCase().replace(/-/g, "");
  return `${uuid.slice(0, 4)}-${uuid.slice(4, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}`;
}
async function getUserLicense(userId) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(licenses).where(eq3(licenses.userId, userId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[License] Failed to get user license:", error);
    return null;
  }
}
async function createLicense(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    const existing = await getUserLicense(data.userId);
    if (existing) {
      console.log("[License] User already has a license");
      return existing;
    }
    const licenseCode = generateLicenseCode();
    const now = /* @__PURE__ */ new Date();
    const insertData = {
      userId: data.userId,
      licenseCode,
      licenseType: "lifetime",
      status: "active",
      stripePaymentIntentId: data.paymentId,
      activatedAt: now
    };
    const result = await db.insert(licenses).values(insertData);
    const insertId = Number(result[0].insertId);
    await db.insert(licenseHistory).values({
      licenseId: insertId,
      eventType: "created",
      details: JSON.stringify({ paymentId: data.paymentId, paymentProvider: data.paymentProvider })
    });
    const created = await db.select().from(licenses).where(eq3(licenses.id, insertId)).limit(1);
    return created[0] || null;
  } catch (error) {
    console.error("[License] Failed to create license:", error);
    return null;
  }
}
async function validateLicense(userId, licenseCode) {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db.select().from(licenses).where(and2(
      eq3(licenses.userId, userId),
      eq3(licenses.licenseCode, licenseCode),
      eq3(licenses.status, "active")
    )).limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[License] Failed to validate license:", error);
    return false;
  }
}
async function getAllLicenses() {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(licenses).orderBy(licenses.createdAt);
    return result;
  } catch (error) {
    console.error("[License] Failed to get all licenses:", error);
    return [];
  }
}
async function updateLicenseStatus(licenseId, status, reason) {
  const db = await getDb();
  if (!db) return false;
  try {
    const current = await db.select().from(licenses).where(eq3(licenses.id, licenseId)).limit(1);
    if (!current[0]) return false;
    const previousStatus = current[0].status;
    await db.update(licenses).set({ status }).where(eq3(licenses.id, licenseId));
    const eventType = status === "revoked" ? "revoked" : status === "expired" ? "expired" : status === "active" ? "activated" : "deactivated";
    await db.insert(licenseHistory).values({
      licenseId,
      eventType,
      details: reason ? JSON.stringify({ reason, previousStatus }) : JSON.stringify({ previousStatus })
    });
    return true;
  } catch (error) {
    console.error("[License] Failed to update license status:", error);
    return false;
  }
}
async function getLicenseHistory(licenseId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(licenseHistory).where(eq3(licenseHistory.licenseId, licenseId)).orderBy(licenseHistory.createdAt);
    return result;
  } catch (error) {
    console.error("[License] Failed to get license history:", error);
    return [];
  }
}
async function activateLicense(userId, licenseCode) {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db.select().from(licenses).where(eq3(licenses.licenseCode, licenseCode)).limit(1);
    if (!result[0]) {
      console.log("[License] License not found:", licenseCode);
      return false;
    }
    const license = result[0];
    if (license.userId && license.userId !== userId) {
      console.log("[License] License already used by another user");
      return false;
    }
    await db.update(licenses).set({
      userId,
      status: "active",
      activatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(licenses.id, license.id));
    await db.insert(licenseHistory).values({
      licenseId: license.id,
      eventType: "activated",
      details: JSON.stringify({ userId })
    });
    return true;
  } catch (error) {
    console.error("[License] Failed to activate license:", error);
    return false;
  }
}
var init_license_db = __esm({
  "server/license-db.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();
import bcrypt from "bcryptjs";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // "lax" is correct for same-origin (frontend + API on same domain).
    // "none" requires secure:true and is meant for cross-origin only.
    sameSite: "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var AuthService = class {
  secretKey = null;
  getSessionSecret() {
    if (!this.secretKey) {
      if (!ENV.cookieSecret) {
        console.error("[Auth] FATAL: JWT_SECRET is not set! Authentication will not work.");
      }
      this.secretKey = new TextEncoder().encode(ENV.cookieSecret);
    }
    return this.secretKey;
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) return /* @__PURE__ */ new Map();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }
  async createSessionToken(user, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name || ""
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(this.getSessionSecret());
    console.log("[Auth] Token created for user:", user.id, "length:", token.length);
    return token;
  }
  async verifySession(cookieValue) {
    if (!cookieValue) return null;
    const parts = cookieValue.split(".");
    if (parts.length !== 3) {
      console.warn(
        "[Auth] Cookie is not a valid JWT format (expected 3 parts, got",
        parts.length + "). Value starts with:",
        cookieValue.substring(0, 20) + "..."
      );
      return null;
    }
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"]
      });
      const { userId, email, name } = payload;
      if (typeof userId !== "number" || typeof email !== "string") {
        console.warn("[Auth] Session payload missing required fields. Got:", {
          userId: typeof userId,
          email: typeof email
        });
        return null;
      }
      return {
        userId,
        email,
        name: name || ""
      };
    } catch (error) {
      console.warn("[Auth] JWT verification failed:", String(error));
      return null;
    }
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    if (!sessionCookie) {
      throw ForbiddenError("No session cookie");
    }
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const user = await getUserById(session.userId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await updateLastSignedIn(user.id);
    return user;
  }
};
var authService = new AuthService();

// server/_core/oauth.ts
var BCRYPT_ROUNDS = 12;
function registerOAuthRoutes(app) {
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caract\xE8res" });
      return;
    }
    try {
      const existing = await getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Un compte existe d\xE9j\xE0 avec cet email" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await createUser({
        email,
        name: name || null,
        passwordHash,
        loginMethod: "email"
      });
      const token = await authService.createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }
    try {
      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      const token = await authService.createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
  app.post("/api/auth/logout", async (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/sync-router.ts
import { z as z2 } from "zod";

// server/sync-db.ts
init_db();
init_schema();
import { eq as eq2, and, gt } from "drizzle-orm";
async function getUserCategories(userId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(categories).where(eq2(categories.userId, userId)).orderBy(categories.sortOrder);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get categories:", error);
    return [];
  }
}
async function getCategoriesSince(userId, since) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(categories).where(and(
      eq2(categories.userId, userId),
      gt(categories.syncTimestamp, since)
    ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get categories since:", error);
    return [];
  }
}
async function upsertCategory(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };
    const existing = await db.select().from(categories).where(and(
      eq2(categories.userId, data.userId),
      eq2(categories.localId, data.localId)
    )).limit(1);
    if (existing.length > 0) {
      await db.update(categories).set(values).where(eq2(categories.id, existing[0].id));
      return { ...existing[0], ...values };
    } else {
      const result = await db.insert(categories).values(values);
      const insertId = Number(result[0].insertId);
      const created = await db.select().from(categories).where(eq2(categories.id, insertId)).limit(1);
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert category:", error);
    return null;
  }
}
async function deleteCategory(userId, localId) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(categories).where(and(
      eq2(categories.userId, userId),
      eq2(categories.localId, localId)
    ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete category:", error);
    return false;
  }
}
async function getUserAlbums(userId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(albums).where(eq2(albums.userId, userId)).orderBy(albums.sortOrder);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get albums:", error);
    return [];
  }
}
async function getAlbumsSince(userId, since) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(albums).where(and(
      eq2(albums.userId, userId),
      gt(albums.syncTimestamp, since)
    ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get albums since:", error);
    return [];
  }
}
async function upsertAlbum(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };
    const existing = await db.select().from(albums).where(and(
      eq2(albums.userId, data.userId),
      eq2(albums.localId, data.localId)
    )).limit(1);
    if (existing.length > 0) {
      await db.update(albums).set(values).where(eq2(albums.id, existing[0].id));
      return { ...existing[0], ...values };
    } else {
      const result = await db.insert(albums).values(values);
      const insertId = Number(result[0].insertId);
      const created = await db.select().from(albums).where(eq2(albums.id, insertId)).limit(1);
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert album:", error);
    return null;
  }
}
async function deleteAlbum(userId, localId) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(albums).where(and(
      eq2(albums.userId, userId),
      eq2(albums.localId, localId)
    ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete album:", error);
    return false;
  }
}
async function getUserPhotosMetadata(userId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(photoMetadata).where(and(
      eq2(photoMetadata.userId, userId),
      eq2(photoMetadata.isDeleted, false)
    ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get photos metadata:", error);
    return [];
  }
}
async function getPhotosMetadataSince(userId, since) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(photoMetadata).where(and(
      eq2(photoMetadata.userId, userId),
      gt(photoMetadata.syncTimestamp, since)
    ));
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get photos metadata since:", error);
    return [];
  }
}
async function getAlbumPhotosMetadata(userId, albumLocalId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(photoMetadata).where(and(
      eq2(photoMetadata.userId, userId),
      eq2(photoMetadata.albumLocalId, albumLocalId),
      eq2(photoMetadata.isDeleted, false)
    )).orderBy(photoMetadata.position);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get album photos metadata:", error);
    return [];
  }
}
async function upsertPhotoMetadata(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };
    const existing = await db.select().from(photoMetadata).where(and(
      eq2(photoMetadata.userId, data.userId),
      eq2(photoMetadata.localId, data.localId)
    )).limit(1);
    if (existing.length > 0) {
      await db.update(photoMetadata).set(values).where(eq2(photoMetadata.id, existing[0].id));
      return { ...existing[0], ...values };
    } else {
      const result = await db.insert(photoMetadata).values(values);
      const insertId = Number(result[0].insertId);
      const created = await db.select().from(photoMetadata).where(eq2(photoMetadata.id, insertId)).limit(1);
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert photo metadata:", error);
    return null;
  }
}
async function syncPhotosMetadataBatch(userId, photos) {
  let success = 0;
  let failed = 0;
  for (const photo of photos) {
    const result = await upsertPhotoMetadata({ ...photo, userId });
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  return { success, failed };
}
async function deletePhotoMetadata(userId, localId) {
  const db = await getDb();
  if (!db) return false;
  try {
    const now = Date.now();
    await db.update(photoMetadata).set({
      isDeleted: true,
      deletedAt: /* @__PURE__ */ new Date(),
      syncTimestamp: now
    }).where(and(
      eq2(photoMetadata.userId, userId),
      eq2(photoMetadata.localId, localId)
    ));
    return true;
  } catch (error) {
    console.error("[Sync] Failed to delete photo metadata:", error);
    return false;
  }
}
async function getUserSettings(userId) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(userSettings).where(eq2(userSettings.userId, userId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Sync] Failed to get user settings:", error);
    return null;
  }
}
async function upsertUserSettings(data) {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = Date.now();
    const values = { ...data, syncTimestamp: now };
    const existing = await db.select().from(userSettings).where(eq2(userSettings.userId, data.userId)).limit(1);
    if (existing.length > 0) {
      await db.update(userSettings).set(values).where(eq2(userSettings.id, existing[0].id));
      return { ...existing[0], ...values };
    } else {
      const result = await db.insert(userSettings).values(values);
      const insertId = Number(result[0].insertId);
      const created = await db.select().from(userSettings).where(eq2(userSettings.id, insertId)).limit(1);
      return created[0] || null;
    }
  } catch (error) {
    console.error("[Sync] Failed to upsert user settings:", error);
    return null;
  }
}
async function logSyncAction(data) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(syncLog).values({
      ...data,
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error("[Sync] Failed to log sync action:", error);
    return false;
  }
}
async function getSyncLogSince(userId, since) {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db.select().from(syncLog).where(and(
      eq2(syncLog.userId, userId),
      gt(syncLog.timestamp, since)
    )).orderBy(syncLog.timestamp);
    return result;
  } catch (error) {
    console.error("[Sync] Failed to get sync log:", error);
    return [];
  }
}

// server/thumbnails.ts
init_storage();
function getThumbnailPath(userId, photoLocalId) {
  return `thumbnails/${userId}/${photoLocalId}.jpg`;
}
async function uploadThumbnail(userId, photoLocalId, thumbnailData) {
  try {
    const path3 = getThumbnailPath(userId, photoLocalId);
    let data = thumbnailData;
    if (typeof thumbnailData === "string" && thumbnailData.startsWith("data:image")) {
      const base64Data = thumbnailData.split(",")[1];
      data = Buffer.from(base64Data, "base64");
    }
    const result = await storagePut(path3, data, "image/jpeg");
    return {
      url: result.url,
      key: result.key
    };
  } catch (error) {
    console.error("[Thumbnails] Failed to upload thumbnail:", error);
    return null;
  }
}
async function uploadThumbnailsBatch(userId, thumbnails) {
  const results = await Promise.all(
    thumbnails.map(async (thumb) => {
      try {
        const result = await uploadThumbnail(userId, thumb.photoLocalId, thumb.data);
        if (result) {
          return {
            photoLocalId: thumb.photoLocalId,
            url: result.url,
            key: result.key
          };
        }
        return {
          photoLocalId: thumb.photoLocalId,
          url: null,
          key: null,
          error: "Upload failed"
        };
      } catch (error) {
        return {
          photoLocalId: thumb.photoLocalId,
          url: null,
          key: null,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    })
  );
  return results;
}

// server/sync-router.ts
var categorySchema = z2.object({
  localId: z2.string(),
  name: z2.string(),
  contentType: z2.enum(["photos", "documents"]).optional(),
  icon: z2.string().optional(),
  color: z2.string().optional(),
  sortOrder: z2.number().optional(),
  isSystem: z2.boolean().optional()
});
var albumSchema = z2.object({
  localId: z2.string(),
  categoryLocalId: z2.string().optional(),
  name: z2.string(),
  description: z2.string().optional(),
  contentType: z2.enum(["photos", "documents"]).optional(),
  coverPhotoLocalId: z2.string().optional(),
  sortOrder: z2.number().optional(),
  photoCount: z2.number().optional(),
  isSystem: z2.boolean().optional(),
  isPrivate: z2.boolean().optional()
});
var photoMetadataSchema = z2.object({
  localId: z2.string(),
  albumLocalId: z2.string().optional(),
  fileName: z2.string().optional(),
  mediaType: z2.enum(["photo", "video", "document"]).optional(),
  mimeType: z2.string().optional(),
  fileSize: z2.number().optional(),
  width: z2.number().optional(),
  height: z2.number().optional(),
  fileHash: z2.string().optional(),
  position: z2.number().optional(),
  rotation: z2.number().optional(),
  cropData: z2.string().optional(),
  scale: z2.number().optional(),
  title: z2.string().optional(),
  caption: z2.string().optional(),
  tags: z2.string().optional(),
  rating: z2.number().optional(),
  isFavorite: z2.boolean().optional(),
  dateTaken: z2.string().optional(),
  gpsLatitude: z2.number().optional(),
  gpsLongitude: z2.number().optional(),
  cameraModel: z2.string().optional()
});
var userSettingsSchema = z2.object({
  displayMode: z2.string().optional(),
  thumbnailSize: z2.number().optional(),
  themeColor: z2.string().optional(),
  backgroundTexture: z2.string().optional(),
  language: z2.string().optional(),
  defaultPhotoSort: z2.string().optional(),
  defaultSortOrder: z2.string().optional(),
  autoCreateThumbnails: z2.boolean().optional(),
  detectDuplicates: z2.boolean().optional(),
  readExifData: z2.boolean().optional(),
  additionalSettings: z2.string().optional()
});
var syncRouter = router({
  // ==================== CATÉGORIES ====================
  categories: router({
    /**
     * Récupère toutes les catégories de l'utilisateur
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const categories2 = await getUserCategories(ctx.user.id);
      return { categories: categories2, timestamp: Date.now() };
    }),
    /**
     * Récupère les catégories modifiées depuis un timestamp
     */
    getSince: protectedProcedure.input(z2.object({ since: z2.number() })).query(async ({ ctx, input }) => {
      const categories2 = await getCategoriesSince(ctx.user.id, input.since);
      return { categories: categories2, timestamp: Date.now() };
    }),
    /**
     * Crée ou met à jour une catégorie
     */
    upsert: protectedProcedure.input(categorySchema).mutation(async ({ ctx, input }) => {
      const category = await upsertCategory({
        ...input,
        userId: ctx.user.id
      });
      if (category) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "category",
          entityLocalId: input.localId,
          action: "update",
          newData: JSON.stringify(input)
        });
      }
      return { success: !!category, category };
    }),
    /**
     * Synchronise plusieurs catégories en batch
     */
    syncBatch: protectedProcedure.input(z2.object({ categories: z2.array(categorySchema) })).mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.categories.map((cat) => upsertCategory({ ...cat, userId: ctx.user.id }))
      );
      const success = results.filter((r) => r !== null).length;
      const failed = results.filter((r) => r === null).length;
      return { success, failed, timestamp: Date.now() };
    }),
    /**
     * Supprime une catégorie
     */
    delete: protectedProcedure.input(z2.object({ localId: z2.string() })).mutation(async ({ ctx, input }) => {
      const success = await deleteCategory(ctx.user.id, input.localId);
      if (success) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "category",
          entityLocalId: input.localId,
          action: "delete"
        });
      }
      return { success };
    })
  }),
  // ==================== ALBUMS ====================
  albums: router({
    /**
     * Récupère tous les albums de l'utilisateur
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const albums2 = await getUserAlbums(ctx.user.id);
      return { albums: albums2, timestamp: Date.now() };
    }),
    /**
     * Récupère les albums modifiés depuis un timestamp
     */
    getSince: protectedProcedure.input(z2.object({ since: z2.number() })).query(async ({ ctx, input }) => {
      const albums2 = await getAlbumsSince(ctx.user.id, input.since);
      return { albums: albums2, timestamp: Date.now() };
    }),
    /**
     * Crée ou met à jour un album
     */
    upsert: protectedProcedure.input(albumSchema).mutation(async ({ ctx, input }) => {
      const album = await upsertAlbum({
        ...input,
        userId: ctx.user.id
      });
      if (album) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "album",
          entityLocalId: input.localId,
          action: "update",
          newData: JSON.stringify(input)
        });
      }
      return { success: !!album, album };
    }),
    /**
     * Synchronise plusieurs albums en batch
     */
    syncBatch: protectedProcedure.input(z2.object({ albums: z2.array(albumSchema) })).mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.albums.map((album) => upsertAlbum({ ...album, userId: ctx.user.id }))
      );
      const success = results.filter((r) => r !== null).length;
      const failed = results.filter((r) => r === null).length;
      return { success, failed, timestamp: Date.now() };
    }),
    /**
     * Supprime un album
     */
    delete: protectedProcedure.input(z2.object({ localId: z2.string() })).mutation(async ({ ctx, input }) => {
      const success = await deleteAlbum(ctx.user.id, input.localId);
      if (success) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "album",
          entityLocalId: input.localId,
          action: "delete"
        });
      }
      return { success };
    })
  }),
  // ==================== PHOTOS METADATA ====================
  photos: router({
    /**
     * Récupère toutes les métadonnées photos de l'utilisateur
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const photos = await getUserPhotosMetadata(ctx.user.id);
      return { photos, timestamp: Date.now() };
    }),
    /**
     * Récupère les métadonnées modifiées depuis un timestamp
     */
    getSince: protectedProcedure.input(z2.object({ since: z2.number() })).query(async ({ ctx, input }) => {
      const photos = await getPhotosMetadataSince(ctx.user.id, input.since);
      return { photos, timestamp: Date.now() };
    }),
    /**
     * Récupère les métadonnées d'un album spécifique
     */
    getByAlbum: protectedProcedure.input(z2.object({ albumLocalId: z2.string() })).query(async ({ ctx, input }) => {
      const photos = await getAlbumPhotosMetadata(ctx.user.id, input.albumLocalId);
      return { photos, timestamp: Date.now() };
    }),
    /**
     * Crée ou met à jour une métadonnée photo
     */
    upsert: protectedProcedure.input(photoMetadataSchema).mutation(async ({ ctx, input }) => {
      const photo = await upsertPhotoMetadata({
        ...input,
        userId: ctx.user.id,
        dateTaken: input.dateTaken ? new Date(input.dateTaken) : void 0
      });
      if (photo) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "photo",
          entityLocalId: input.localId,
          action: "update",
          newData: JSON.stringify(input)
        });
      }
      return { success: !!photo, photo };
    }),
    /**
     * Synchronise plusieurs métadonnées photos en batch
     */
    syncBatch: protectedProcedure.input(z2.object({ photos: z2.array(photoMetadataSchema) })).mutation(async ({ ctx, input }) => {
      const photos = input.photos.map((p) => ({
        ...p,
        userId: ctx.user.id,
        dateTaken: p.dateTaken ? new Date(p.dateTaken) : void 0
      }));
      const result = await syncPhotosMetadataBatch(ctx.user.id, photos);
      return { ...result, timestamp: Date.now() };
    }),
    /**
     * Supprime une métadonnée photo (soft delete)
     */
    delete: protectedProcedure.input(z2.object({ localId: z2.string() })).mutation(async ({ ctx, input }) => {
      const success = await deletePhotoMetadata(ctx.user.id, input.localId);
      if (success) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "photo",
          entityLocalId: input.localId,
          action: "delete"
        });
      }
      return { success };
    })
  }),
  // ==================== MINIATURES ====================
  thumbnails: router({
    /**
     * Upload une miniature
     */
    upload: protectedProcedure.input(z2.object({
      photoLocalId: z2.string(),
      data: z2.string()
      // Base64 encoded image
    })).mutation(async ({ ctx, input }) => {
      const result = await uploadThumbnail(
        ctx.user.id,
        input.photoLocalId,
        input.data
      );
      if (result) {
        await upsertPhotoMetadata({
          userId: ctx.user.id,
          localId: input.photoLocalId,
          thumbnailUrl: result.url,
          thumbnailKey: result.key
        });
      }
      return { success: !!result, url: result?.url, key: result?.key };
    }),
    /**
     * Upload plusieurs miniatures en batch
     */
    uploadBatch: protectedProcedure.input(z2.object({
      thumbnails: z2.array(z2.object({
        photoLocalId: z2.string(),
        data: z2.string()
      }))
    })).mutation(async ({ ctx, input }) => {
      const thumbnails = input.thumbnails.map((t2) => ({
        photoLocalId: t2.photoLocalId,
        data: t2.data
      }));
      const results = await uploadThumbnailsBatch(ctx.user.id, thumbnails);
      for (const result of results) {
        if (result.url) {
          await upsertPhotoMetadata({
            userId: ctx.user.id,
            localId: result.photoLocalId,
            thumbnailUrl: result.url,
            thumbnailKey: result.key || void 0
          });
        }
      }
      const success = results.filter((r) => r.url !== null).length;
      const failed = results.filter((r) => r.url === null).length;
      return { success, failed, results };
    })
  }),
  // ==================== PARAMÈTRES ====================
  settings: router({
    /**
     * Récupère les paramètres de l'utilisateur
     */
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      return { settings, timestamp: Date.now() };
    }),
    /**
     * Met à jour les paramètres de l'utilisateur
     */
    update: protectedProcedure.input(userSettingsSchema).mutation(async ({ ctx, input }) => {
      const settings = await upsertUserSettings({
        ...input,
        userId: ctx.user.id
      });
      if (settings) {
        await logSyncAction({
          userId: ctx.user.id,
          entityType: "settings",
          entityLocalId: "user_settings",
          action: "update",
          newData: JSON.stringify(input)
        });
      }
      return { success: !!settings, settings };
    })
  }),
  // ==================== SYNCHRONISATION COMPLÈTE ====================
  /**
   * Récupère toutes les données pour une synchronisation initiale
   */
  getFullSync: protectedProcedure.query(async ({ ctx }) => {
    const [categories2, albums2, photos, settings] = await Promise.all([
      getUserCategories(ctx.user.id),
      getUserAlbums(ctx.user.id),
      getUserPhotosMetadata(ctx.user.id),
      getUserSettings(ctx.user.id)
    ]);
    return {
      categories: categories2,
      albums: albums2,
      photos,
      settings,
      timestamp: Date.now()
    };
  }),
  /**
   * Récupère les modifications depuis un timestamp (sync incrémentale)
   */
  getChangesSince: protectedProcedure.input(z2.object({ since: z2.number() })).query(async ({ ctx, input }) => {
    const [categories2, albums2, photos, syncLog2] = await Promise.all([
      getCategoriesSince(ctx.user.id, input.since),
      getAlbumsSince(ctx.user.id, input.since),
      getPhotosMetadataSince(ctx.user.id, input.since),
      getSyncLogSince(ctx.user.id, input.since)
    ]);
    return {
      categories: categories2,
      albums: albums2,
      photos,
      syncLog: syncLog2,
      timestamp: Date.now()
    };
  }),
  /**
   * Synchronise toutes les données en une seule requête
   */
  pushFullSync: protectedProcedure.input(z2.object({
    categories: z2.array(categorySchema).optional(),
    albums: z2.array(albumSchema).optional(),
    photos: z2.array(photoMetadataSchema).optional(),
    settings: userSettingsSchema.optional()
  })).mutation(async ({ ctx, input }) => {
    const results = {
      categories: { success: 0, failed: 0 },
      albums: { success: 0, failed: 0 },
      photos: { success: 0, failed: 0 },
      settings: false
    };
    if (input.categories) {
      for (const cat of input.categories) {
        const result = await upsertCategory({ ...cat, userId: ctx.user.id });
        if (result) results.categories.success++;
        else results.categories.failed++;
      }
    }
    if (input.albums) {
      for (const album of input.albums) {
        const result = await upsertAlbum({ ...album, userId: ctx.user.id });
        if (result) results.albums.success++;
        else results.albums.failed++;
      }
    }
    if (input.photos) {
      const photos = input.photos.map((p) => ({
        ...p,
        userId: ctx.user.id,
        dateTaken: p.dateTaken ? new Date(p.dateTaken) : void 0
      }));
      const photoResult = await syncPhotosMetadataBatch(ctx.user.id, photos);
      results.photos = photoResult;
    }
    if (input.settings) {
      const settingsResult = await upsertUserSettings({
        ...input.settings,
        userId: ctx.user.id
      });
      results.settings = !!settingsResult;
    }
    return { results, timestamp: Date.now() };
  })
});

// server/routers.ts
init_license_db();
import { z as z3 } from "zod";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Routes de synchronisation
  sync: syncRouter,
  // Routes de paiement (placeholder pour Stripe)
  payment: router({
    getPlans: publicProcedure.query(() => {
      return [
        {
          id: "lifetime",
          name: "Licence \xE0 vie",
          price: 4900,
          // 49€ en centimes
          currency: "EUR",
          features: [
            "Acc\xE8s \xE0 vie",
            "Mises \xE0 jour gratuites",
            "Support prioritaire"
          ]
        }
      ];
    }),
    createCheckoutSession: protectedProcedure.input(z3.object({
      planId: z3.string(),
      turnstileToken: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      console.log("[Payment] Creating checkout session for user:", ctx.user.id, "plan:", input.planId);
      return {
        url: null,
        sessionId: null,
        message: "Stripe non configur\xE9. Veuillez contacter le support."
      };
    })
  }),
  // Routes d'abonnement (publicProcedure : accessible sans connexion pour le mode essai gratuit)
  subscription: router({
    getStatus: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return {
          status: "trial",
          plan: null,
          expiresAt: null
        };
      }
      const license = await getUserLicense(ctx.user.id);
      return {
        status: license?.status || "trial",
        plan: license?.licenseType || null,
        expiresAt: license?.expiresAt || null
      };
    })
  }),
  // Routes de gestion des licences
  license: router({
    /**
     * Vérifie si l'utilisateur a une licence valide
     */
    check: protectedProcedure.query(async ({ ctx }) => {
      const license = await getUserLicense(ctx.user.id);
      return {
        hasLicense: !!license && license.status === "active",
        license
      };
    }),
    /**
     * Crée une nouvelle licence après paiement
     */
    create: protectedProcedure.input(z3.object({
      paymentId: z3.string(),
      paymentProvider: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const license = await createLicense({
        userId: ctx.user.id,
        paymentId: input.paymentId,
        paymentProvider: input.paymentProvider || "stripe"
      });
      return { success: !!license, license };
    }),
    /**
     * Valide une licence par clé
     */
    validate: protectedProcedure.input(z3.object({ licenseKey: z3.string() })).mutation(async ({ ctx, input }) => {
      const isValid = await validateLicense(ctx.user.id, input.licenseKey);
      return { valid: isValid };
    }),
    /**
     * Liste toutes les licences (admin uniquement)
     */
    getAllLicenses: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      const licenses2 = await getAllLicenses();
      return licenses2;
    }),
    /**
     * Récupère les licences de l'utilisateur connecté
     */
    getMyLicenses: protectedProcedure.query(async ({ ctx }) => {
      const license = await getUserLicense(ctx.user.id);
      return license ? [license] : [];
    }),
    /**
     * Récupère l'historique d'une licence
     */
    getLicenseHistory: protectedProcedure.input(z3.object({ licenseId: z3.number() })).query(async ({ ctx, input }) => {
      const { getLicenseHistory: getLicenseHistory2 } = await Promise.resolve().then(() => (init_license_db(), license_db_exports));
      return getLicenseHistory2(input.licenseId);
    }),
    /**
     * Révoque une licence (admin)
     */
    revokeLicense: protectedProcedure.input(z3.object({ licenseId: z3.number(), reason: z3.string().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      const success = await updateLicenseStatus(input.licenseId, "revoked", input.reason);
      return { success };
    }),
    /**
     * Réactive une licence (admin)
     */
    reactivateLicense: protectedProcedure.input(z3.object({ licenseId: z3.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      const success = await updateLicenseStatus(input.licenseId, "active");
      return { success };
    }),
    /**
     * Active une licence sur l'appareil actuel
     */
    activate: protectedProcedure.input(z3.object({ licenseCode: z3.string() })).mutation(async ({ ctx, input }) => {
      const { activateLicense: activateLicense2 } = await Promise.resolve().then(() => (init_license_db(), license_db_exports));
      const success = await activateLicense2(ctx.user.id, input.licenseCode);
      return { success };
    }),
    /**
     * Désactive une licence
     */
    deactivate: protectedProcedure.input(z3.object({ licenseId: z3.number() })).mutation(async ({ ctx, input }) => {
      const success = await updateLicenseStatus(input.licenseId, "pending");
      return { success };
    }),
    /**
     * Met à jour le statut d'une licence (admin uniquement)
     */
    updateStatus: protectedProcedure.input(z3.object({
      licenseId: z3.number(),
      status: z3.enum(["active", "pending", "expired", "revoked", "transferred"]),
      reason: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      const success = await updateLicenseStatus(
        input.licenseId,
        input.status,
        input.reason
      );
      return { success };
    })
  }),
  // Routes de détourage d'images
  detourage: router({
    /**
     * Détoure une image (supprime le fond) en utilisant @imgly/background-removal-node
     * Accepte soit une URL, soit des données base64
     */
    removeBackground: publicProcedure.input(z3.object({
      imageData: z3.string()
      // URL ou data:image/...;base64,...
    })).mutation(async ({ input }) => {
      const { removeBackground } = await import("@imgly/background-removal-node");
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      try {
        console.log("[Detourage] Starting background removal...");
        let imageSource;
        if (input.imageData.startsWith("data:")) {
          const matches = input.imageData.match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/);
          if (!matches) {
            const simpleMatch = input.imageData.match(/^data:([^;]+);base64,([\s\S]+)$/);
            if (!simpleMatch) {
              console.error("[Detourage] Invalid base64 format, data starts with:", input.imageData.substring(0, 100));
              throw new Error("Format base64 invalide");
            }
            const mimeType = simpleMatch[1];
            const base64Data = simpleMatch[2];
            const binaryData = Buffer.from(base64Data, "base64");
            imageSource = new Blob([binaryData], { type: mimeType });
            console.log("[Detourage] Processing base64 image with mime:", mimeType);
          } else {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const binaryData = Buffer.from(base64Data, "base64");
            imageSource = new Blob([binaryData], { type: mimeType });
            console.log("[Detourage] Processing base64 image with mime:", mimeType);
          }
        } else {
          imageSource = input.imageData;
          console.log("[Detourage] Processing URL:", input.imageData);
        }
        const resultBlob = await removeBackground(imageSource, {
          progress: (key, current, total) => {
            console.log(`[Detourage] Progress: ${key} ${current}/${total}`);
          }
        });
        const arrayBuffer = await resultBlob.arrayBuffer();
        const resultBuffer = Buffer.from(arrayBuffer);
        const timestamp2 = Date.now();
        const { url } = await storagePut2(
          `detourage/${timestamp2}.png`,
          resultBuffer,
          "image/png"
        );
        console.log("[Detourage] Success, result URL:", url);
        return {
          success: true,
          resultUrl: url
        };
      } catch (error) {
        console.error("[Detourage] Error:", error);
        throw new Error(`Erreur lors du d\xE9tourage: ${error.message || "Erreur inconnue"}`);
      }
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authService.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
var plugins = [react(), tailwindcss(), jsxLocPlugin()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      external: [
        "nsfwjs",
        "@tensorflow/tfjs",
        "@tensorflow/tfjs-core",
        "@tensorflow/tfjs-backend-webgl",
        "@tensorflow/tfjs-backend-cpu",
        "@tensorflow/tfjs-converter",
        "@tensorflow/tfjs-layers",
        "onnxruntime-web",
        "onnxruntime-web/webgpu"
      ]
    }
  },
  server: {
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(import.meta.dirname, "./public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not set. Auth will not work.");
  }
  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL environment variable is not set.");
  }
  const app = express2();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
