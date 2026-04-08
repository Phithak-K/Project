import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // 1. ดึง Token และ Role จาก Cookies
  const token = request.cookies.get('token')?.value
  const userRole = request.cookies.get('role')?.value

  // ดึง Subdomain และ Base Host (เช่น localhost:3000)
  const hostParts = hostname.split('.')
  const isLocalhost = hostname.includes('localhost')
  
  // หา Subdomain จริงๆ (ถ้าเข้า app.localhost:3000 -> currentHost คือ 'app')
  let currentHost = ''
  if (hostParts.length > (isLocalhost ? 1 : 2)) {
    currentHost = hostParts[0]
  }

  // 2. ข้ามไฟล์ระบบและไฟล์รูปภาพ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ฟังก์ชันช่วยสร้าง URL ให้ตรงกับ Host ปัจจุบัน (ป้องกันการเด้งไป .com)
  const getRedirectUrl = (path: string, subdomain: string = '') => {
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    // ถ้ามี subdomain ให้ใส่จุดข้างหน้า ถ้าไม่มี (เช่น localhost) ไม่ต้องใส่
    const newHost = subdomain ? `${subdomain}.${isLocalhost ? 'localhost:3000' : 'swiftpath.com:3000'}` : hostname
    return `${protocol}://${newHost}${path}`
  }

  // 3. 🔒 Logic การป้องกัน (Route Protection)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/verify-otp')

  // CASE A: ยังไม่ได้ล็อกอิน แต่อยากเข้าหน้า Dashboard
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // CASE B: ล็อกอินแล้ว แต่พยายามเข้าหน้า Login/Register อีกครั้ง
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // CASE C: เช็ค Role (Security Check) 
  // ปรับให้ Redirect กลับไปที่ app.localhost:3000 อย่างปลอดภัย
  if (token && !isAuthPage) {
    if (currentHost === 'store' && userRole !== 'Merchant') {
      return NextResponse.redirect(getRedirectUrl('/login', 'app'))
    }
    if (currentHost === 'fleet' && userRole !== 'Driver') {
      return NextResponse.redirect(getRedirectUrl('/login', 'app'))
    }
  }

  // 4. จัดการกรณีเข้าผ่าน localhost:3000 ตรงๆ (Root)
  // บังคับให้เด้งไปที่ app. ปัจจุบันเสมอ
  if (!currentHost || currentHost === 'localhost') {
    if (pathname === '/' || pathname === '/register' || pathname === '/login') {
      return NextResponse.redirect(getRedirectUrl(pathname, 'app'))
    }
    if (pathname.startsWith('/verify-otp')) {
      return NextResponse.next()
    }
  }

  // 5. Rewrite เส้นทาง (Internal Routing)
  if (pathname.startsWith('/verify-otp')) {
    return NextResponse.next()
  }

  // แมป Subdomain เข้ากับ Folder ภายใน
  if (currentHost === 'store') {
    return NextResponse.rewrite(new URL(`/merchant${pathname}`, request.url))
  }
  if (currentHost === 'fleet') {
    return NextResponse.rewrite(new URL(`/driver${pathname}`, request.url))
  }
  if (currentHost === 'app' || currentHost === 'localhost') {
    return NextResponse.rewrite(new URL(`/customer${pathname}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}