import { eq, and, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import { users, passwordResetTokens } from "../drizzle/schema";
import type { User, PasswordResetToken } from "../drizzle/schema";

// Lazy init: opened on first call so SQLITE_PATH can be set by electron/main.ts
// before any request is handled.
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = process.env.SQLITE_PATH ?? path.resolve("./duoclass.db");
    const sqlite = new Database(dbPath);
    _db = drizzle(sqlite);
  }
  return _db;
}

export async function createUser(data: {
  email: string;
  name: string | null;
  passwordHash: string;
  loginMethod: string;
  role?: string;
}): Promise<User> {
  const db = getDb();

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      loginMethod: data.loginMethod,
      role: data.role ?? "user",
      lastSignedIn: new Date(),
    })
    .returning();

  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

/**
 * Retourne l'utilisateur local unique (Electron).
 * Le crée automatiquement au premier lancement si la table est vide.
 */
export async function getOrCreateLocalUser(): Promise<User> {
  const db = getDb();
  const existing = await db.select().from(users).limit(1);
  if (existing[0]) return existing[0];
  const [user] = await db
    .insert(users)
    .values({
      email: "local@duoclass",
      name: "Utilisateur local",
      passwordHash: "",
      loginMethod: "local",
      role: "admin",
      lastSignedIn: new Date(),
    })
    .returning();
  return user;
}

export async function updateLastSignedIn(userId: number): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ lastSignedIn: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updatePassword(userId: number, passwordHash: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ==================== PASSWORD RESET TOKENS ====================

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 heure

export async function createPasswordResetToken(userId: number): Promise<string> {
  const db = getDb();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });

  return token;
}

export async function validatePasswordResetToken(
  token: string
): Promise<PasswordResetToken | null> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = getDb();
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}
