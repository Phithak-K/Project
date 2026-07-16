'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ServerCrash, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // สามารถเพิ่มระบบเก็บ Log ข้อผิดพลาดไว้บน Sentry หรือระบบอื่นๆ ได้ที่นี่
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <main style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="sp-animate">
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'var(--danger-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <ServerCrash size={40} style={{ color: 'var(--danger-500)' }} />
          </div>
          <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900, marginBottom: '0.5rem' }}>
            500
          </h1>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--n-800)', marginBottom: '1rem' }}>
            ระบบขัดข้องชั่วคราว
          </h2>
          <p style={{ color: 'var(--n-500)', marginBottom: '2rem', maxWidth: '320px', margin: '0 auto 2rem' }}>
            ขออภัย เกิดข้อผิดพลาดบางอย่างในระบบของเรา กรุณาลองใหม่อีกครั้งในภายหลัง
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => reset()} className="sp-btn-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
              <RefreshCcw size={18} /> ลองใหม่
            </button>
            <Link href="/" className="sp-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
