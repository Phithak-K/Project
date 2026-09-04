/**
 * lib/cookies.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised cookie utility — replaces the getCookie() function that was
 * copy-pasted into 20+ page components across all portals.
 *
 * NOTE: These are client-readable cookies (role, etc.) used for UX redirects.
 * Real authorization is enforced by the middleware (proxy.ts), NOT here.
 */

/**
 * Read a cookie value from document.cookie.
 * Returns null when running on the server (SSR guard included).
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  return null;
}

/**
 * Delete a cookie by setting its expiry in the past.
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; path=/`;
}
