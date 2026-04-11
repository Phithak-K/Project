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

  // DEBUG LOG (ทิ้งไว้ตามที่ผู้ใช้ขอ)
  console.log(`[Middleware] Path: ${pathname} | Host: ${hostname} | Subdomain: ${currentHost} | Token: ${!!token} | Role: ${userRole}`);

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
    const protocol = 'https'; // บังคับ HTTPS ตลอดเพื่อแก้ปัญหา Redirect Loop จาก --experimental-https
    const baseHost = isLocalhost ? 'localhost:3000' : 'swiftpath.com:3000'
    const newHost = subdomain ? `${subdomain}.${baseHost}` : baseHost
    return `${protocol}://${newHost}${path}`
  }

  // ฟังก์ชันล้าง Cookie แบบขุดรากถอนโคน (แก้ปัญหา Cookie ดื้อติดอยู่ตาม Subdomain ต่างๆ)
  const clearBadCookies = (response: NextResponse) => {
    const cookieOptions = [
      { path: '/' },
      { path: '/', domain: 'localhost' },
      { path: '/', domain: '.localhost' }
    ];
    cookieOptions.forEach(opt => {
      response.cookies.set('token', '', { ...opt, maxAge: 0 });
      response.cookies.set('role', '', { ...opt, maxAge: 0 });
    });
    return response;
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/verify-otp')

  // STRICT NULL CHECK: ถ้าไม่มีรหัส Token, ไปผุดที่ Login ของตัวเองเท่านั้น
  if (!token) {
    if (!isAuthPage) {
      const loginUrl = getRedirectUrl('/login', currentHost || 'app')
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }
  }

  // BYPASS AUTH PAGES: ปล่อยผ่านหน้า Auth โดยไม่มี Redirection ใดๆ (กันเงื่อนไขตีกัน)
  if (isAuthPage) {
    if (token && userRole) {
       // ล็อกอินแล้วแต่มาหน้าล็อกอิน -> ส่งกลับ
       let targetHost = currentHost || 'app';
       if (userRole === 'Merchant') targetHost = 'store';
       else if (userRole === 'Driver') targetHost = 'fleet';
       else if (userRole === 'Customer') targetHost = 'app';
       
       const response = NextResponse.redirect(new URL(getRedirectUrl('/', targetHost), request.url))
       if (targetHost !== currentHost) {
           // Auto-clean: ลบ Cookie ที่อยู่ผิดโดเมนทิ้งทันที เพื่อแก้ปัญหาเตะไปเตะมา (Ping-Pong)
           return clearBadCookies(response);
       }
       return response;
    }
    // ถ้ายังไม่ล็อกอิน ปล่อยให้เห็นหน้าล็อกอินไปเลย (จะไป Rewrite ท้ายไฟล์)
  } else {
    // ROLE VERIFICATION (ถ้าไม่ใช่หน้า Auth)
    if (currentHost === 'app') {
      if (userRole && userRole !== 'Customer') {
        const response = NextResponse.redirect(new URL(getRedirectUrl('/login', ''), request.url));
        return clearBadCookies(response); // เตะไป localhost:3000/login
      }
    }
    
    if (currentHost === 'store' && userRole !== 'Merchant') {
      const correctHost = userRole === 'Driver' ? 'fleet' : 'app';
      const response = NextResponse.redirect(new URL(getRedirectUrl('/', correctHost), request.url));
      return clearBadCookies(response);
    }

    if (currentHost === 'fleet' && userRole !== 'Driver') {
      const correctHost = userRole === 'Merchant' ? 'store' : 'app';
      const response = NextResponse.redirect(new URL(getRedirectUrl('/', correctHost), request.url));
      return clearBadCookies(response);
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