/**
 * Fonctions de base de données pour la gestion des licences
 * Gère les opérations CRUD sur les licences utilisateur
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { licenses, licenseHistory, License, InsertLicense } from "../drizzle/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Génère une clé de licence unique
 */
function generateLicenseCode(): string {
  const uuid = uuidv4().toUpperCase().replace(/-/g, '');
  // Format: XXXX-XXXX-XXXX-XXXX
  return `${uuid.slice(0, 4)}-${uuid.slice(4, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}`;
}

/**
 * Récupère la licence d'un utilisateur
 */
export async function getUserLicense(userId: number): Promise<License | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(licenses)
      .where(eq(licenses.userId, userId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[License] Failed to get user license:", error);
    return null;
  }
}

/**
 * Crée une nouvelle licence (admin génère un code).
 * Le code est en statut "pending" jusqu'à activation par un utilisateur.
 */
export async function createLicense(data: {
  email?: string;
  licenseType?: string;
}): Promise<License | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const licenseCode = generateLicenseCode();

    const [created] = await db
      .insert(licenses)
      .values({
        licenseCode,
        email: data.email || null,
        licenseType: data.licenseType || "lifetime",
        status: "pending",
      })
      .returning();

    // Enregistrer dans l'historique
    await db.insert(licenseHistory).values({
      licenseId: created.id,
      eventType: "created",
      details: JSON.stringify({ email: data.email }),
    });

    return created;
  } catch (error) {
    console.error("[License] Failed to create license:", error);
    return null;
  }
}

/**
 * Valide une licence par code
 */
export async function validateLicense(userId: number, licenseCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db
      .select()
      .from(licenses)
      .where(and(
        eq(licenses.userId, userId),
        eq(licenses.licenseCode, licenseCode),
        eq(licenses.status, 'active')
      ))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("[License] Failed to validate license:", error);
    return false;
  }
}

/**
 * Récupère toutes les licences (admin)
 */
export async function getAllLicenses(): Promise<License[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(licenses)
      .orderBy(licenses.createdAt);
    return result;
  } catch (error) {
    console.error("[License] Failed to get all licenses:", error);
    return [];
  }
}

/**
 * Met à jour le statut d'une licence
 */
export async function updateLicenseStatus(
  licenseId: number,
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'transferred',
  reason?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Récupérer la licence actuelle
    const current = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId))
      .limit(1);

    if (!current[0]) return false;

    const previousStatus = current[0].status;

    // Mettre à jour le statut
    await db
      .update(licenses)
      .set({ status })
      .where(eq(licenses.id, licenseId));

    // Enregistrer dans l'historique
    const eventType = status === 'revoked' ? 'revoked' : 
                      status === 'expired' ? 'expired' : 
                      status === 'active' ? 'activated' : 'deactivated';
    
    await db.insert(licenseHistory).values({
      licenseId,
      eventType,
      details: reason ? JSON.stringify({ reason, previousStatus }) : JSON.stringify({ previousStatus }),
    });

    return true;
  } catch (error) {
    console.error("[License] Failed to update license status:", error);
    return false;
  }
}


/**
 * Récupère l'historique d'une licence
 */
export async function getLicenseHistory(licenseId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(licenseHistory)
      .where(eq(licenseHistory.licenseId, licenseId))
      .orderBy(licenseHistory.createdAt);
    return result;
  } catch (error) {
    console.error("[License] Failed to get license history:", error);
    return [];
  }
}

/**
 * Active une licence pour un utilisateur
 */
export async function activateLicense(userId: number, licenseCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Trouver la licence par code
    const result = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseCode, licenseCode))
      .limit(1);

    if (!result[0]) {
      console.log("[License] License not found:", licenseCode);
      return false;
    }

    const license = result[0];

    // Vérifier si la licence est déjà utilisée par un autre utilisateur
    if (license.userId && license.userId !== userId) {
      console.log("[License] License already used by another user");
      return false;
    }

    // Activer la licence
    await db
      .update(licenses)
      .set({
        userId,
        status: 'active',
        activatedAt: new Date(),
      })
      .where(eq(licenses.id, license.id));

    // Enregistrer dans l'historique
    await db.insert(licenseHistory).values({
      licenseId: license.id,
      eventType: 'activated',
      details: JSON.stringify({ userId }),
    });

    return true;
  } catch (error) {
    console.error("[License] Failed to activate license:", error);
    return false;
  }
}
