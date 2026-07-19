/**
 * Server-side logout route that clears HttpOnly cookies.
 * Client-side code cannot delete HttpOnly cookies with document.cookie,
 * so we need this server route to properly expire them.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Expire both cookies by setting maxAge to 0
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  response.cookies.set('role', '', { maxAge: 0, path: '/' });

  return response;
}
