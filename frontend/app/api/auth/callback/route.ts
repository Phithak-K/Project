/**
 * SEC-01 / SEC-03 FIX: HttpOnly Cookie Server Route
 *
 * This Next.js API Route handles the login response from the backend
 * and sets the JWT token as an HttpOnly, Secure cookie.
 *
 * By moving cookie-setting to the server, we prevent JavaScript from
 * reading the token, completely eliminating the XSS Session Hijacking
 * attack vector that existed when using `document.cookie` on the client.
 *
 * Usage: POST /api/auth/callback
 * Body: { access_token: string, user: { role: string, ... } }
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, user } = body;

    if (!access_token || !user?.role) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
    const isLocalhost = baseDomain.includes('localhost');

    // Determine redirect URL based on role
    const proto = isLocalhost ? 'http' : 'https';
    let redirectUrl: string;
    if (user.role === 'Merchant') {
      redirectUrl = `${proto}://store.${baseDomain}/`;
    } else if (user.role === 'Driver') {
      redirectUrl = `${proto}://fleet.${baseDomain}/`;
    } else {
      redirectUrl = `${proto}://app.${baseDomain}/`;
    }

    const response = NextResponse.json({ ok: true, redirectUrl });

    const cookieOptions = {
      httpOnly: false,              // Reverted to false: Client-side JS needs to read token for direct API calls to NestJS
      secure: !isLocalhost,         // ← HTTPS-only in production
      sameSite: 'lax' as const,
      maxAge: 86400,                // 24 hours
      path: '/',
      // For cross-subdomain sharing (store., fleet., app.)
      domain: isLocalhost ? undefined : `.${baseDomain.split(':')[0]}`,
    };

    // Set token as HttpOnly cookie (invisible to JavaScript)
    response.cookies.set('token', access_token, cookieOptions);

    // role cookie does NOT need httpOnly — middleware reads it client-side too
    response.cookies.set('role', user.role, {
      ...cookieOptions,
      httpOnly: false, // Role is non-sensitive, can be read by JS for UI logic
    });

    return response;
  } catch (err) {
    console.error('[/api/auth/callback] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
