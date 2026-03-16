/**
 * Rate-limiter en mémoire — aucune dépendance externe.
 * Fenêtre glissante par clé (IP, email, etc.)
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Nettoyage périodique des entrées expirées (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 5 * 60 * 1000).unref();

/**
 * Vérifie et incrémente le compteur pour une clé.
 * @returns true si la requête est autorisée, false si rate-limited
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

/** Réinitialise le compteur (ex: après un login réussi) */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
