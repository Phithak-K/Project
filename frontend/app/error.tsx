'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCcw, Home, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error monitoring service (e.g., Sentry) here
    console.warn('[SwiftPath Error]', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="sp-error-page">
      <main style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>

        {/* Decorative hero number */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '2rem' }}>
          <span className="sp-error-code" aria-hidden="true">500</span>
          {/* Floating icon on top */}
          <div
            className="sp-error-icon-wrap sp-error-icon-wrap-danger"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginBottom: 0,
            }}
          >
            <AlertTriangle size={32} style={{ color: '#ef4444' }} />
          </div>
        </div>

        {/* Content */}
        <div className="sp-animate" style={{ animationDelay: '0.1s' }}>
          <span className="sp-section-eyebrow" style={{ marginBottom: '0.75rem', color: '#ef4444' }}>
            Server Error
          </span>
          <h1
            className="sp-font-display sp-text-lg"
            style={{ fontWeight: 900, marginBottom: '0.75rem', color: 'var(--n-900)' }}
          >
            ระบบขัดข้องชั่วคราว
          </h1>
          <p
            style={{
              color: 'var(--n-500)',
              marginBottom: '2.5rem',
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}
          >
            ขออภัย เกิดข้อผิดพลาดบางอย่างในระบบของเรา
            <br />
            กรุณาลองใหม่อีกครั้ง หรือกลับไปหน้าหลัก
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* reset() ต่อตรงเข้ากับปุ่ม "ลองใหม่" */}
            <button
              onClick={() => reset()}
              className="sp-btn-brand"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RefreshCcw size={16} />
              ลองใหม่
            </button>
            <button
              onClick={() => history.back()}
              className="sp-btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              ย้อนกลับ
            </button>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Link
              href="/"
              className="sp-link-muted"
              style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Home size={14} />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {/* Debug info (visible only in dev) */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <div
            style={{
              marginTop: '2.5rem',
              padding: '0.875rem 1rem',
              background: 'var(--n-100)',
              border: '1px solid var(--n-200)',
              borderRadius: '8px',
              textAlign: 'left',
            }}
          >
            <p className="sp-caps" style={{ color: 'var(--n-500)', marginBottom: '0.5rem' }}>
              Debug Info
            </p>
            <code style={{ fontSize: '0.75rem', color: 'var(--n-600)', wordBreak: 'break-all' }}>
              Digest: {error.digest}
            </code>
          </div>
        )}
      </main>
    </div>
  );
}
