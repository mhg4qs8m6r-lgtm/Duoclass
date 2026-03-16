import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { authService } from "./sdk";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

const BCRYPT_ROUNDS = 12;

// Rate-limit : 5 tentatives par fenêtre de 15 min par IP
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
// Reset password : 3 demandes par heure par IP
const RESET_MAX_ATTEMPTS = 3;
const RESET_WINDOW_MS = 60 * 60 * 1000;

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`register:${ip}`, AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS)) {
      res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes." });
      return;
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    try {
      const existing = await db.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Un compte existe déjà avec cet email" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const user = await db.createUser({
        email,
        name: name || null,
        passwordHash,
        loginMethod: "email",
      });

      const token = await authService.createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`login:${ip}`, AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS)) {
      res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes." });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }

      // Login réussi → reset le compteur de rate-limit
      resetRateLimit(`login:${ip}`);

      const token = await authService.createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
      });
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

  // ==================== RESET MOT DE PASSE ====================

  /**
   * Demande de reset — génère un token et le log en console.
   * En production, remplacer le console.log par un envoi SMTP (nodemailer).
   */
  app.post("/api/auth/request-reset", async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`reset:${ip}`, RESET_MAX_ATTEMPTS, RESET_WINDOW_MS)) {
      res.status(429).json({ error: "Trop de demandes. Réessayez plus tard." });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email requis" });
      return;
    }

    try {
      // Toujours répondre 200 pour ne pas révéler si l'email existe
      const user = await db.getUserByEmail(email);
      if (user) {
        const token = await db.createPasswordResetToken(user.id);
        // TODO: envoyer par email en production
        console.log(`[Auth] Password reset token for ${email}: ${token}`);
      }

      res.json({ success: true, message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
    } catch (error) {
      console.error("[Auth] Request reset failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  /**
   * Confirmation du reset — valide le token et change le mot de passe.
   */
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: "Token et nouveau mot de passe requis" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    try {
      const resetToken = await db.validatePasswordResetToken(token);
      if (!resetToken) {
        res.status(400).json({ error: "Token invalide ou expiré" });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await db.updatePassword(resetToken.userId, passwordHash);
      await db.markPasswordResetTokenUsed(token);

      res.json({ success: true, message: "Mot de passe modifié avec succès" });
    } catch (error) {
      console.error("[Auth] Reset password failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
}
