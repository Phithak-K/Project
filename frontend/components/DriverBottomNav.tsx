'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Radio, Navigation, Clock, Wallet } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/driver', label: 'งานของฉัน', icon: Package, exact: true },
  { href: '/driver/radar', label: 'เรดาร์', icon: Radio, exact: false },
  { href: '/driver/route', label: 'เส้นทาง', icon: Navigation, exact: false },
  { href: '/driver/history', label: 'ประวัติ', icon: Clock, exact: false },
  { href: '/driver/wallet', label: 'กระเป๋า', icon: Wallet, exact: false },
] as const;

export default function DriverBottomNav() {
  const pathname = usePathname();

  // ไม่แสดงบนหน้าเข้าสู่ระบบ / สมัครสมาชิก
  if (
    !pathname ||
    pathname.startsWith('/driver/login') ||
    pathname.startsWith('/driver/register')
  ) {
    return null;
  }

  return (
    <nav
      aria-label="เมนูหลักคนขับบนมือถือ"
      className="sp-driver-bottom-nav sm:hidden fixed bottom-0 inset-x-0 z-[900] border-t border-[var(--n-200)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-[600px] mx-auto px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href || pathname === '/driver/dashboard'
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 no-underline transition-colors min-h-[44px] ${
                isActive
                  ? 'text-[var(--brand-500)] font-extrabold'
                  : 'text-[var(--n-500)] hover:text-[var(--n-800)] font-semibold'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 w-8 h-0.5 rounded-b-full bg-[var(--brand-500)]"
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[11px] leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
