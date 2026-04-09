import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // 1. ดึง Token และ Role จาก Cookies
  // สำคัญ: Middleware อ่านได้เฉพาะ Cookie ที่ถูกเซตมาอย่างถูกต้องเท่านั้น
  const token = request.cookies.get('token')?.value
  const userRole = request.cookies.get('role')?.value

  // ดึง Subdomain และตรวจสอบสภาพแวดล้อม
  const hostParts = hostname.split('.')
  const isLocalhost = hostname.includes('localhost')
  
  // หา Subdomain (เช่น store, fleet, app)
  let currentHost = ''
  if (hostParts.length > (isLocalhost ? 1 : 2)) {
    currentHost = hostParts[0]
  }

  // 2. ข้ามไฟล์ระบบและไฟล์รูปภาพ (Static Files)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ฟังก์ชันช่วยสร้าง URL ให้ตรงกับ Host ปัจจุบันแบบ Dynamic
  const getRedirectUrl = (path: string, subdomain: string = '') => {
    const protocol = request.nextUrl.protocol.replace(':', '') || 'https'
    const baseHost = isLocalhost ? 'localhost:3000' : 'swiftpath.com:3000'
    const newHost = subdomain ? `${subdomain}.${baseHost}` : baseHost
    return `${protocol}://${newHost}${path}`
  }

  // 3. 🔒 Logic การป้องกัน (Route Protection)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/verify-otp')

  // CASE A: ยังไม่ได้ล็อกอิน แต่อยากเข้าหน้า Dashboard
  if (!token && !isAuthPage) {
    // ป้องกัน Loop โดยการส่งไปที่หน้า Login ของ Subdomain นั้นๆ แบบระบุ URL เต็ม
    const loginUrl = getRedirectUrl('/login', currentHost || 'app')
    return NextResponse.redirect(new URL(loginUrl, request.url))
  }

  // CASE B: ล็อกอินแล้ว แต่พยายามเข้าหน้า Login/Register/Verify-OTP อีกครั้ง
  if (token && isAuthPage) {
    // ดีดกลับไปหน้า Dashboard ของ Subdomain ตัวเอง
    const dashboardUrl = getRedirectUrl('/', currentHost || 'app')
    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }

  // CASE C: เช็ค Role Security (กันคนขับแอบเข้าหน้าพ่อค้า)
  if (token && !isAuthPage) {
    if (currentHost === 'store' && userRole !== 'Merchant') {
      return NextResponse.redirect(new URL(getRedirectUrl('/login', 'app'), request.url))
    }
    if (currentHost === 'fleet' && userRole !== 'Driver') {
      return NextResponse.redirect(new URL(getRedirectUrl('/login', 'app'), request.url))
    }
  }

  // 4. จัดการกรณีเข้าผ่าน localhost:3000 ตรงๆ (Root Domain)
  if (!currentHost || currentHost === 'localhost') {
    // ถ้าเข้าหน้าหลักเฉยๆ ให้เด้งไปหน้าลูกค้า (app.)
    if (pathname === '/' || pathname === '/register' || pathname === '/login') {
      return NextResponse.redirect(new URL(getRedirectUrl(pathname, 'app'), request.url))
    }
    // ยกเว้นหน้า Verify OTP ให้ผ่านไปได้เพื่อดึง Query Params
    if (pathname.startsWith('/verify-otp')) {
      return NextResponse.next()
    }
  }

  // 5. Rewrite เส้นทาง (Internal Routing) 
  // นี่คือจุดที่ทำให้ Folder โครงสร้างข้างในทำงานร่วมกับ Subdomain ได้
  
  if (pathname.startsWith('/verify-otp')) {
    return NextResponse.next()
  }

  // แมป Subdomain เข้ากับ Folder ภายในโปรเจกต์
  if (currentHost === 'store') {
    return NextResponse.rewrite(new URL(`/merchant${pathname}`, request.url))
  }
  if (currentHost === 'fleet') {
    return NextResponse.rewrite(new URL(`/driver${pathname}`, request.url))
  }
  if (currentHost === 'app' || !currentHost) {
    return NextResponse.rewrite(new URL(`/customer${pathname}`, request.url))
  }

  return NextResponse.next()
}

// กำหนดขอบเขตการทำงานของ Middleware
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}