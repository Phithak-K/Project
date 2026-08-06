'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(''); // email หรือ username
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isEmail = identifier.includes('@');
      const loginBody = isEmail
        ? { email: identifier, password, role: 'Customer' }
        : { username: identifier, password, role: 'Customer' };

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginBody),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ ส่งโทเค็นให้ Server-side Next.js จัดการคุกกี้ (HttpOnly) แทนการเขียนลง document.cookie
        const callbackRes = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: data.access_token, user: data.user }),
        });
        const callbackData = await callbackRes.json();

        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get('callbackUrl');
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const isLocalhost = baseDomain.includes('localhost');

        // ✅ MEDIUM-03 FIX: Domain Allowlist — ป้องกัน Open Redirect
        const isAllowedCallback = (url: string): boolean => {
          try {
            const parsed = new URL(decodeURIComponent(url));
            const allowed = ['localhost', 'swiftpath.com'];
            return allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
          } catch { return false; }
        };

        if (callbackUrl && isAllowedCallback(callbackUrl)) {
          window.location.href = decodeURIComponent(callbackUrl);
        } else {
          window.location.href = callbackData.redirectUrl || (isLocalhost ? `http://app.${baseDomain}/` : `https://app.${baseDomain}/`);
        }
      } else {
        setError(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sp-auth-wrap">
      {/* ── Left: Form ── */}
      <div className="sp-auth-form-panel">
        <div style={{ maxWidth: '400px', width: '100%' }}>
          {/* Logo */}
          <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
            <span className="sp-logo">
              Swift<span className="sp-logo-accent">Path</span>
            </span>
          </div>

          {/* Heading */}
          <div className="sp-animate-d1" style={{ marginBottom: '2rem' }}>
            <span className="sp-section-eyebrow">Customer Portal</span>
            <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900 }}>
              เข้าสู่ระบบ
            </h1>
            <p style={{ color: 'var(--n-500)', marginTop: '0.375rem', fontSize: '0.9rem' }}>
              ติดตามพัสดุและจัดการออเดอร์ของคุณ
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="sp-alert sp-alert-error sp-animate" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="sp-field">
              <label className="sp-label">อีเมล หรือ Username</label>
              <input
                id="email"
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="sp-input"
                placeholder="name@example.com หรือ username_ของคุณ"
              />
            </div>

            <div className="sp-field">
              <label className="sp-label">รหัสผ่าน</label>
              <div className="sp-input-wrap">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="sp-input"
                  placeholder="••••••••"
                />
                <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={isLoading}
              className="sp-btn-primary sp-btn-full"
              style={{ marginTop: '0.5rem', padding: '0.875rem' }}
            >
              {isLoading ? <span className="sp-spinner" /> : <>เข้าสู่ระบบ <ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Footer links */}
          <div className="sp-animate-d3" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="sp-link">สมัครสมาชิก</Link>
            </p>
          </div>

          <div className="sp-divider" style={{ marginTop: '2rem' }} />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href={`//store.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`}>
              <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>เข้าสู่ระบบร้านค้า</button>
            </a>
            <a href={`//fleet.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`}>
              <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>เข้าสู่ระบบคนขับ</button>
            </a>
          </div>
        </div>
      </div>

      {/* ── Right: Brand Panel ── */}
      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">
          Swift<span className="sp-logo-accent">Path</span>
        </span>

        <div>
          <p className="sp-caps" style={{ color: 'var(--brand-400)', marginBottom: '1rem' }}>Enterprise Logistics</p>
          <p className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-50)', lineHeight: 1.1 }}>
            ส่งถึงมือ<br />ทุกที่ทุกเวลา
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: '32ch' }}>
            ระบบ Logistics อัจฉริยะที่คำนวณราคาตามสภาพอากาศ และติดตามพัสดุแบบ Real-time
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>98%</p>
              <p className="sp-caps" style={{ color: 'var(--n-600)' }}>On-time Rate</p>
            </div>
            <div>
              <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>3 min</p>
              <p className="sp-caps" style={{ color: 'var(--n-600)' }}>Avg. Pickup</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
