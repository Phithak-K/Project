import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface MiddlewareContext {
  request: NextRequest
  pathname: string
  hostname: string
  currentHost: string   // เช่น 'app' | 'store' | 'fleet' | ''
  isLocalhost: boolean
  token: string | undefined
  userRole: string | undefined
  isAuthPage: boolean
  isPublicAppPage: boolean
  getRedirectUrl: (path: string, subdomain?: string) => string
  clearBadCookies: (response: NextResponse) => NextResponse
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: สร้าง URL สำหรับ Redirect ตาม Subdomain
// ─────────────────────────────────────────────────────────────────────────────

function buildRedirectUrl(
  path: string,
  subdomain: string = '',
  protocol: string,
  isLocalhost: boolean,
): string {
  const baseHost = isLocalhost ? 'localhost:3000' : 'swiftpath.com:3000'
  const newHost  = subdomain ? `${subdomain}.${baseHost}` : baseHost
  return `${protocol}://${newHost}${path}`
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ล้าง Cookie ที่ติดค้างอยู่ตาม Subdomain (แก้ Ping-Pong loop)
// ─────────────────────────────────────────────────────────────────────────────

function clearBadCookies(response: NextResponse): NextResponse {
  const cookieOptions = [
    { path: '/' },
    { path: '/', domain: 'localhost' },
    { path: '/', domain: '.localhost' },
  ]
  cookieOptions.forEach(opt => {
    response.cookies.set('token', '', { ...opt, maxAge: 0 })
    response.cookies.set('role',  '', { ...opt, maxAge: 0 })
  })
  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin)
// คืนค่า: NextResponse ถ้าต้อง Redirect/Block | null ถ้าผ่านได้
// ─────────────────────────────────────────────────────────────────────────────

function checkAdminAccess(ctx: MiddlewareContext): NextResponse | null {
  const { pathname, token, userRole, request, getRedirectUrl } = ctx

  // หน้า Admin Login เปิดให้เข้าได้เสมอ ไม่ต้องตรวจสอบ
  if (pathname === '/admin/login') return NextResponse.next()

  if (pathname.startsWith('/admin')) {
    if (!token || userRole !== 'Admin') {
      const loginUrl = getRedirectUrl('/admin/login', '')
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }
    return NextResponse.next()
  }

  return null // ไม่ใช่ /admin path → ส่งต่อให้ตรวจขั้นตอนถัดไป
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: จัดการหน้า Auth (Login / Register / Verify-OTP / Track)
// — ถ้าล็อกอินแล้ว → Redirect ไปหน้าหลักของ Role ตัวเอง
// — ถ้ายังไม่ล็อกอิน → ปล่อยผ่าน (จะ Rewrite ท้ายไฟล์)
// คืนค่า: NextResponse ถ้าต้อง Redirect | null ถ้าปล่อยผ่าน
// ─────────────────────────────────────────────────────────────────────────────

function checkAuthPageAccess(ctx: MiddlewareContext): NextResponse | null {
  const { token, userRole, currentHost, request, getRedirectUrl } = ctx

  if (!token || !userRole) return null // ยังไม่ล็อกอิน → ปล่อยผ่าน

  // ล็อกอินแล้วแต่เข้าหน้า Auth → ส่งกลับ Dashboard ของ Role ตัวเอง
  let targetHost = currentHost || 'app'
  if (userRole === 'Merchant') targetHost = 'store'
  else if (userRole === 'Driver')   targetHost = 'fleet'
  else if (userRole === 'Customer') targetHost = 'app'

  const response = NextResponse.redirect(new URL(getRedirectUrl('/', targetHost), request.url))

  // ถ้า Cookie อยู่ผิด Subdomain → ล้างออกเพื่อป้องกัน Redirect loop
  if (targetHost !== currentHost) return clearBadCookies(response)

  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ตรวจสอบสิทธิ์ Customer (Subdomain: app)
// — Role ไม่ใช่ Customer → ไล่ออกไป Root Login + ล้าง Cookie
// คืนค่า: NextResponse ถ้าต้อง Redirect | null ถ้าผ่าน
// ─────────────────────────────────────────────────────────────────────────────

function checkCustomerAccess(ctx: MiddlewareContext): NextResponse | null {
  const { currentHost, userRole, request, getRedirectUrl } = ctx

  if (currentHost !== 'app') return null

  if (userRole && userRole !== 'Customer') {
    const response = NextResponse.redirect(new URL(getRedirectUrl('/login', ''), request.url))
    return clearBadCookies(response)
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ตรวจสอบสิทธิ์ Merchant (Subdomain: store)
// — Role ไม่ใช่ Merchant → เตะไป Subdomain ที่ถูกต้อง
// คืนค่า: NextResponse ถ้าต้อง Redirect | null ถ้าผ่าน
// ─────────────────────────────────────────────────────────────────────────────

function checkMerchantAccess(ctx: MiddlewareContext): NextResponse | null {
  const { currentHost, userRole, request, getRedirectUrl } = ctx

  if (currentHost !== 'store') return null

  if (userRole !== 'Merchant') {
    const correctHost = userRole === 'Driver' ? 'fleet' : 'app'
    const response = NextResponse.redirect(new URL(getRedirectUrl('/', correctHost), request.url))
    return clearBadCookies(response)
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ตรวจสอบสิทธิ์ Driver (Subdomain: fleet)
// — Role ไม่ใช่ Driver → เตะไป Subdomain ที่ถูกต้อง
// คืนค่า: NextResponse ถ้าต้อง Redirect | null ถ้าผ่าน
// ─────────────────────────────────────────────────────────────────────────────

function checkDriverAccess(ctx: MiddlewareContext): NextResponse | null {
  const { currentHost, userRole, request, getRedirectUrl } = ctx

  if (currentHost !== 'fleet') return null

  if (userRole !== 'Driver') {
    const correctHost = userRole === 'Merchant' ? 'store' : 'app'
    const response = NextResponse.redirect(new URL(getRedirectUrl('/', correctHost), request.url))
    return clearBadCookies(response)
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const url      = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // ── ข้ามไฟล์ Static (_next, /api, ไฟล์ที่มีนามสกุล) ──────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')   ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ── ดึงข้อมูลพื้นฐาน ────────────────────────────────────────────────────────
  const token    = request.cookies.get('token')?.value
  const userRole = request.cookies.get('role')?.value

  const hostParts   = hostname.split('.')
  const isLocalhost = hostname.includes('localhost')

  let currentHost = ''
  if (hostParts.length > (isLocalhost ? 1 : 2)) {
    currentHost = hostParts[0]
  }

  // DEBUG LOG (ทิ้งไว้ตามที่ผู้ใช้ขอ)
  console.log(
    `[Middleware] Path: ${pathname} | Host: ${hostname} | ` +
    `Subdomain: ${currentHost} | Token: ${!!token} | Role: ${userRole}`
  )

  // ── สร้าง Helper ที่ผูกกับ Request ปัจจุบัน ─────────────────────────────────
  const protocol = url.protocol.replace(':', '')
  const getRedirectUrl = (path: string, subdomain: string = '') =>
    buildRedirectUrl(path, subdomain, protocol, isLocalhost)

  const isAuthPage     = pathname.startsWith('/login')
                      || pathname.startsWith('/register')
                      || pathname.startsWith('/verify-otp')
                      || pathname.startsWith('/track')
  const isPublicAppPage = currentHost === 'app' && pathname === '/'

  // ── สร้าง Context Object ส่งให้ทุก Helper ──────────────────────────────────
  const ctx: MiddlewareContext = {
    request, pathname, hostname, currentHost,
    isLocalhost, token, userRole,
    isAuthPage, isPublicAppPage,
    getRedirectUrl,
    clearBadCookies,
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1: Admin Gate — ตรวจก่อนเสมอ (CRITICAL SEC-FIX)
  // ════════════════════════════════════════════════════════════════════════════
  const adminResult = checkAdminAccess(ctx)
  if (adminResult) return adminResult

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2: Unauthenticated Guard
  // ถ้าไม่มี Token และไม่ใช่หน้า Public → Redirect ไป Login พร้อม callbackUrl
  // ════════════════════════════════════════════════════════════════════════════
  if (!token && !isAuthPage && !isPublicAppPage) {
    const loginBaseUrl         = getRedirectUrl('/login', currentHost || 'app')
    const callbackUrl          = encodeURIComponent(request.url)
    const loginUrlWithCallback = `${loginBaseUrl}?callbackUrl=${callbackUrl}`
    return NextResponse.redirect(new URL(loginUrlWithCallback, request.url))
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3: Auth Page Gate
  // ถ้าล็อกอินแล้วแต่เข้าหน้า Auth → Redirect กลับ Dashboard
  // ════════════════════════════════════════════════════════════════════════════
  if (isAuthPage) {
    const authResult = checkAuthPageAccess(ctx)
    if (authResult) return authResult
    // ถ้ายังไม่ล็อกอิน → ปล่อยผ่าน (Rewrite ท้ายไฟล์จะจัดการ)
  } else {
    // ════════════════════════════════════════════════════════════════════════
    // STEP 4: Role-Based Access Control (ตรวจแบบขนาน ใครโดน return ก่อน)
    // ════════════════════════════════════════════════════════════════════════
    const roleResult =
      checkCustomerAccess(ctx) ??
      checkMerchantAccess(ctx) ??
      checkDriverAccess(ctx)

    if (roleResult) return roleResult
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 5: Root Domain Handler (localhost:3000 ตรงๆ)
  // ════════════════════════════════════════════════════════════════════════════
  if (!currentHost || currentHost === 'localhost') {
    if (pathname === '/') return NextResponse.next() // Landing Page

    // Auth + Orders บน Root → เด้งไป app subdomain
    if (isAuthPage || pathname.startsWith('/orders')) {
      return NextResponse.redirect(new URL(getRedirectUrl(pathname, 'app'), request.url))
    }

    return NextResponse.next()
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 6: Wrong-Subdomain Guard (Fix 404 for /driver/register on app subdomain)
  // ════════════════════════════════════════════════════════════════════════════
  if (currentHost === 'app' && (pathname.startsWith('/merchant') || pathname.startsWith('/driver'))) {
    const targetRole = pathname.startsWith('/merchant') ? 'store' : 'fleet'
    const cleanPath  = pathname.replace('/merchant', '').replace('/driver', '')
    return NextResponse.redirect(new URL(getRedirectUrl(cleanPath || '/', targetRole), request.url))
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 7: Shared Root Pages (ห้าม Rewrite — เพราะไม่มีโฟลเดอร์ /customer/verify-otp)
  // ════════════════════════════════════════════════════════════════════════════
  const sharedRootPaths = ['/verify-otp', '/track']
  if (sharedRootPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 8: Subdomain → Folder Rewrite
  // ════════════════════════════════════════════════════════════════════════════
  if (currentHost === 'store') return NextResponse.rewrite(new URL(`/merchant${pathname}`, request.url))
  if (currentHost === 'fleet') return NextResponse.rewrite(new URL(`/driver${pathname}`,   request.url))
  if (currentHost === 'app')   return NextResponse.rewrite(new URL(`/customer${pathname}`, request.url))

  return NextResponse.next()
}

// กำหนดขอบเขตการทำงานของ Middleware
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}