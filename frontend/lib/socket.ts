/**
 * lib/socket.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised Socket.io factory — replaces the SOCKET_URL constant that was
 * duplicated in 4+ files (driver/orders/[id], merchant/orders/[id],
 * customer/orders/[id], driver/radar, ChatBox).
 */

import { io, Socket } from 'socket.io-client';

/** Resolved backend URL: env var → localhost fallback in dev → empty in prod */
export const SOCKET_URL: string =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '');

/**
 * Create a Socket.io connection with a consistent config:
 * - Bearer token auth
 * - Dual transports (WebSocket with polling fallback)
 * - Bounded reconnection (5 retries, exponential back-off up to 10 s)
 */
export function createSocket(token: string): Socket {
  return io(SOCKET_URL, {
    auth: { token: `Bearer ${token}` },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
}

/**
 * Fetch the current JWT from the HttpOnly-cookie proxy endpoint,
 * then create a socket with it.
 * Returns null if the token could not be retrieved.
 */
export async function createAuthenticatedSocket(): Promise<Socket | null> {
  try {
    const res = await fetch('/api/auth/token');
    if (!res.ok) return null;
    const { token } = await res.json();
    if (!token) return null;
    return createSocket(token);
  } catch (err) {
    console.warn('[socket] Failed to obtain auth token:', err);
    return null;
  }
}
