'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.access_token && data.user) {
          const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
          const isLocalhost = baseDomain.includes('localhost');
          const domainStr = isLocalhost ? '' : `domain=.${baseDomain.split(':')[0]}; `;
          const cookieOptions = `path=/; ${domainStr}max-age=86400; SameSite=Lax${isLocalhost ? '' : '; Secure'}`;
          document.cookie = `token=${data.access_token}; ${cookieOptions}`;
          document.cookie = `role=${data.user?.role || 'Customer'}; ${cookieOptions}`;

          const proto = isLocalhost ? 'http' : 'https';
          if (data.user.role === 'Merchant')     window.location.href = `${proto}://store.${baseDomain}/`;
          else if (data.user.role === 'Driver')  window.location.href = `${proto}://fleet.${baseDomain}/`;
          else                                   window.location.href = `${proto}://app.${baseDomain}/`;
        } else {
          router.push('/login');
        }
      } else {
        setError(data.message || 'รหัส OTP ไม่ถูกต้อง');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/resend-otp`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) setSuccess(data.message || 'ส่งรหัสใหม่เรียบร้อยแล้ว');
      else setError(data.message || 'เกิดข้อผิดพลาด');
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="sp-auth-wrap">
      {/* ── Left: Form ── */}
      <div className="sp-auth-form-panel">
        <div style={{ maxWidth: '400px', width: '100%' }}>
          {/* Back */}
          <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
            <Link href="/register" className="sp-link-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
              <ArrowLeft size={15} /> ย้อนกลับ
            </Link>
          </div>

          {/* Icon + heading */}
          <div className="sp-animate-d1" style={{ marginBottom: '2rem' }}>
            <div style={{
              width: '3rem', height: '3rem', borderRadius: '0.625rem',
              background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', marginBottom: '1.25rem'
            }}>
              <KeyRound size={22} />
            </div>
            <span className="sp-section-eyebrow">ยืนยันตัวตน</span>
            <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900 }}>กรอกรหัส OTP</h1>
            <p style={{ color: 'var(--n-500)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              รหัส 6 หลักถูกส่งไปที่<br />
              <strong style={{ color: 'var(--n-700)' }}>{email || 'อีเมลของคุณ'}</strong>
            </p>
          </div>

          {error   && <div className="sp-alert sp-alert-error sp-animate"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="sp-alert sp-alert-success sp-animate" style={{ marginBottom: '1rem' }}>{success}</div>}

          <form onSubmit={handleVerify} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className="sp-input-otp"
              placeholder="000000"
            />

            <button
              id="btn-verify"
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="sp-btn-primary sp-btn-full"
              style={{ padding: '0.875rem' }}
            >
              {isLoading ? <span className="sp-spinner" /> : 'ยืนยันรหัส'}
            </button>
          </form>

          <div className="sp-animate-d3" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              ยังไม่ได้รับรหัส?{' '}
              <button
                onClick={handleResend}
                disabled={isResending || !email}
                className="sp-link"
                style={{ background: 'none', border: 'none', padding: 0, cursor: isResending ? 'not-allowed' : 'pointer' }}
              >
                {isResending ? 'กำลังส่งใหม่...' : 'ส่งรหัสอีกครั้ง'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Brand Panel ── */}
      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
        <div>
          <p className="sp-caps" style={{ color: 'var(--brand-400)', marginBottom: '1rem' }}>ความปลอดภัย</p>
          <p className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-50)', lineHeight: 1.1 }}>
            ยืนยันตัวตน<br />เพื่อความปลอดภัย
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: '32ch' }}>
            รหัส OTP มีอายุ 10 นาที ถ้าไม่ได้รับให้ตรวจสอบ Spam folder หรือกด "ส่งรหัสอีกครั้ง"
          </p>
        </div>
        <div />
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="sp-page-loading"><span className="sp-spinner sp-spinner-lg" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
