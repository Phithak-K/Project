/**
 * Server-side logout route that clears HttpOnly cookies.
 * Client-side code cannot delete HttpOnly cookies with document.cookie,
 * so we need this server route to properly expire them.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  const isLocalhost = baseDomain.includes('localhost');
  const cookieOptions = {
    maxAge: 0,
    path: '/',
    domain: isLocalhost ? undefined : `.${baseDomain.split(':')[0]}`,
  };

  // Expire both cookies by setting maxAge to 0
  response.cookies.set('token', '', cookieOptions);
  response.cookies.set('role', '', cookieOptions);

  return response;
}
