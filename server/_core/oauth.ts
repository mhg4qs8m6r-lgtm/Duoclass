import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import * as bcrypt from "bcryptjs";

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }
    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, user.id, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
