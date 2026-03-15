/**
 * Tests pour subscription.getStatus
 * Vérifie que la procédure est accessible sans authentification (mode essai gratuit)
 * et retourne le statut correct pour les utilisateurs connectés.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: {
      headers: {},
      cookies: {},
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    passwordHash: "$2a$12$fake",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: {
      headers: {},
      cookies: {},
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe("subscription.getStatus", () => {
  it("retourne 'trial' pour un utilisateur non connecté (mode essai gratuit)", async () => {
    const caller = appRouter.createCaller(createGuestContext());
    const result = await caller.subscription.getStatus();

    expect(result).toBeDefined();
    expect(result.status).toBe("trial");
    expect(result.plan).toBeNull();
    expect(result.expiresAt).toBeNull();
  });

  it("ne lève pas d'erreur UNAUTHORIZED pour un utilisateur non connecté", async () => {
    const caller = appRouter.createCaller(createGuestContext());

    await expect(caller.subscription.getStatus()).resolves.not.toThrow();
  });

  it("retourne 'trial' par défaut pour un utilisateur connecté sans licence", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.subscription.getStatus();

    expect(result).toBeDefined();
    expect(result.status).toBe("trial");
  });

  it("retourne les champs status, plan et expiresAt", async () => {
    const caller = appRouter.createCaller(createGuestContext());
    const result = await caller.subscription.getStatus();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("expiresAt");
  });
});
