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
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'https://project-wi39.onrender.com');

export type SocketConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';

/**
 * Create a Socket.io connection with a consistent config:
 * - Optional Bearer token auth (omitted for public rooms like tracking)
 * - Dual transports (WebSocket with polling fallback)
 * - Exponential reconnection (up to 10 retries, 1-5s back-off)
 */
export function createSocket(token?: string): Socket {
  const options: any = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  };

  if (token) {
    options.auth = { token: `Bearer ${token}` };
    options.withCredentials = true;
  }

  return io(SOCKET_URL, options);
}

/**
 * Create an unauthenticated public Socket.io connection
 * Used for public tracking without requiring login cookies
 */
export function createPublicSocket(): Socket {
  return createSocket();
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
