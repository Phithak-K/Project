import Link from 'next/link';
import { Home, Compass } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

export default function NotFound() {
  return (
    <div className="sp-error-page">
      <main style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>

        {/* Decorative hero number */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '2rem' }}>
          <span className="sp-error-code" aria-hidden="true">404</span>
          {/* Floating icon on top */}
          <div
            className="sp-error-icon-wrap sp-error-icon-wrap-brand"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginBottom: 0,
            }}
          >
            <Compass size={32} style={{ color: 'var(--brand-500)' }} />
          </div>
        </div>

        {/* Content */}
        <div className="sp-animate" style={{ animationDelay: '0.1s' }}>
          <span className="sp-section-eyebrow" style={{ marginBottom: '0.75rem' }}>
            Page Not Found
          </span>
          <h1
            className="sp-font-display sp-text-lg"
            style={{ fontWeight: 900, marginBottom: '0.75rem', color: 'var(--n-900)' }}
          >
            ไม่พบหน้าที่คุณต้องการ
          </h1>
          <p
            style={{
              color: 'var(--n-500)',
              marginBottom: '2.5rem',
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}
          >
            ดูเหมือนว่าลิงก์ที่คุณเข้ามาอาจจะเสีย หรือหน้านี้ถูกย้าย/ลบไปแล้ว
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              className="sp-btn-brand"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              <Home size={16} />
              กลับหน้าหลัก
            </Link>
            {/* BackButton แยกเป็น Client Component เพื่อใช้ history.back() */}
            <BackButton />
          </div>
        </div>

        {/* Quick links */}
        <div
          className="sp-animate"
          style={{
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--n-150)',
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { href: '/merchant', label: 'Merchant Portal' },
            { href: '/driver', label: 'Driver Portal' },
            { href: '/customer', label: 'Customer Portal' },
            { href: '/track', label: 'ติดตามพัสดุ' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="sp-link"
              style={{ fontSize: '0.8rem', fontWeight: 600 }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
