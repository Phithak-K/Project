import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <main style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="sp-animate">
          <FileQuestion size={64} style={{ color: 'var(--brand-500)', margin: '0 auto 1.5rem', opacity: 0.8 }} />
          <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900, marginBottom: '0.5rem' }}>
            404
          </h1>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--n-800)', marginBottom: '1rem' }}>
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p style={{ color: 'var(--n-500)', marginBottom: '2rem', maxWidth: '320px', margin: '0 auto 2rem' }}>
            ดูเหมือนว่าลิงก์ที่คุณเข้ามาอาจจะเสีย หรือหน้านี้ถูกลบไปแล้ว
          </p>
          <Link href="/" className="sp-btn-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
            <Home size={18} /> กลับหน้าหลัก
          </Link>
        </div>
      </main>
    </div>
  );
}
