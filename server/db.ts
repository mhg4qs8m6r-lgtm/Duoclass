import { eq, and, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import crypto from "crypto";
import { users, passwordResetTokens } from "../drizzle/schema";
import type { User, PasswordResetToken } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function updateLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ lastSignedIn: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updatePassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ==================== PASSWORD RESET TOKENS ====================

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 heure

export async function createPasswordResetToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });

  return token;
}

export async function validatePasswordResetToken(
  token: string
): Promise<PasswordResetToken | null> {
  const db = await getDb();
  if (!db) return null;

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
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}
