export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Construit l'URL de connexion OAuth Manus.
 * Le paramètre state encode l'origine et le chemin de retour.
 * Note : le portail Manus utilise /login (et non /authorize qui retourne 404).
 */
export function getLoginUrl(returnPath?: string): string {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL ?? '';
  const appId = import.meta.env.VITE_APP_ID ?? '';
  const origin = window.location.origin;
  const state = encodeURIComponent(
    JSON.stringify({ origin, returnPath: returnPath ?? window.location.pathname }),
  );
  return `${oauthPortalUrl}/login?app_id=${appId}&state=${state}`;
}
