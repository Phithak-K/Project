/**
 * Server-side logout route that clears HttpOnly cookies.
 * Client-side code cannot delete HttpOnly cookies with document.cookie,
 * so we need this server route to properly expire them.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const host = req.headers.get('host') || '';
  let defaultBaseDomain = 'swiftpath-app.xyz';
  if (host.includes('localhost')) {
    defaultBaseDomain = 'localhost:3000';
  } else if (host) {
    const parts = host.split(':')[0].split('.');
    if (parts.length >= 2) {
      defaultBaseDomain = parts.slice(-2).join('.');
    }
  }
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || defaultBaseDomain;
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
