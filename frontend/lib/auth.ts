/**
 * SEC-01 / SEC-03 FIX: Shared Login Helper
 *
 * This utility function standardises the login flow across all portals
 * (Merchant, Driver, Customer). Instead of calling `document.cookie` directly,
 * it posts the JWT to our own /api/auth/callback route which sets an
 * HttpOnly cookie on the server-side, completely eliminating the XSS risk.
 *
 * Usage:
 *   import { handleLoginCallback } from '@/lib/auth';
 *   await handleLoginCallback(data); // data = { access_token, user }
 */

export async function handleLoginCallback(data: {
  access_token: string;
  user: { role: string; id: number; email: string; name?: string };
}): Promise<{ redirectUrl: string }> {
  const res = await fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to set session cookie');
  }

  const json = await res.json();
  return { redirectUrl: json.redirectUrl };
}

/**
 * Clears auth cookies by calling the server-side logout endpoint.
 * Used in logout handlers across all portals.
 */
export async function handleLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
