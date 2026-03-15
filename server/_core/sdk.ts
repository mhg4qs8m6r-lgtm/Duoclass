import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  userId: number;
  email: string;
  name: string;
};

class AuthService {
  private secretKey: Uint8Array | null = null;

  private getSessionSecret() {
    if (!this.secretKey) {
      if (!ENV.cookieSecret) {
        console.error("[Auth] FATAL: JWT_SECRET is not set! Authentication will not work.");
      }
      this.secretKey = new TextEncoder().encode(ENV.cookieSecret);
    }
    return this.secretKey;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  async createSessionToken(
    user: { id: number; email: string; name: string | null },
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name || "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());

    console.log("[Auth] Token created for user:", user.id, "length:", token.length);
    return token;
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    // A valid JWT has exactly 3 dot-separated parts
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
        algorithms: ["HS256"],
      });

      const { userId, email, name } = payload as Record<string, unknown>;

      if (typeof userId !== "number" || typeof email !== "string") {
        console.warn("[Auth] Session payload missing required fields. Got:", {
          userId: typeof userId,
          email: typeof email,
        });
        return null;
      }

      return {
        userId,
        email: email as string,
        name: (name as string) || "",
      };
    } catch (error) {
      console.warn("[Auth] JWT verification failed:", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);

    if (!sessionCookie) {
      throw ForbiddenError("No session cookie");
    }

    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserById(session.userId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.updateLastSignedIn(user.id);

    return user;
  }
}

export const authService = new AuthService();
