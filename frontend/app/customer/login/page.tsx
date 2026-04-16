'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, User } from 'lucide-react';

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setNeedsVerification(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'Customer' }),
      });

      const data = await response.json();

      if (response.ok) {
        const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const isLocalhost = baseDomain.includes('localhost');
        const cookieDomainStr = isLocalhost ? '' : `domain=.${baseDomain.split(':')[0]};`;

        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; ${cookieDomainStr} expires=${expires}; SameSite=None; Secure`;
        }
        const role = data.user?.role || 'Customer';
        document.cookie = `role=${role}; path=/; ${cookieDomainStr} expires=${expires}; SameSite=None; Secure`;

        if (role === 'Driver') {
          window.location.href = `https://fleet.${baseDomain}/`;
        } else if (role === 'Merchant') {
          window.location.href = `https://store.${baseDomain}/`;
        } else {
          window.location.href = `https://app.${baseDomain}/`;
        }
      } else {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        if (msg.includes('ยังไม่ได้ยืนยัน')) {
          setNeedsVerification(true);
          setErrorMsg('บัญชีนี้ยังไม่ได้ยืนยันตัวตน กรุณาตรวจสอบ OTP ในอีเมลของคุณ');
        } else {
          setErrorMsg(msg);
        }
      }
    } catch (error) {
      console.error('Catch Error:', error);
      setErrorMsg('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sp-auth-wrap">
      <div className="sp-auth-form-panel">
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
            <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          </div>

          <div className="sp-animate-d1" style={{ marginBottom: '2rem' }}>
            <span className="sp-section-eyebrow">Customer Access</span>
            <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900 }}>เข้าสู่ระบบ</h1>
            <p style={{ color: 'var(--n-500)', marginTop: '0.375rem', fontSize: '0.9rem' }}>
              สั่งของและติดตามพัสดุของคุณ
            </p>
          </div>

          {errorMsg && (
            <div className={`sp-alert sp-alert-error sp-animate`} style={{ marginBottom: '1.25rem' }}>
              {errorMsg}
              {needsVerification && (
                <div style={{ marginTop: '0.5rem' }}>
                  <Link href={`/verify-otp?email=${encodeURIComponent(email)}`} style={{ fontWeight: 900, textDecoration: 'underline' }}>
                    → ยืนยัน OTP อีกครั้ง
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="sp-field">
              <label className="sp-label">อีเมลผู้ใช้งาน</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sp-input"
                placeholder="customer@example.com"
              />
            </div>
            <div className="sp-field">
              <label className="sp-label">รหัสผ่าน</label>
              <div className="sp-input-wrap">
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="sp-input"
                  placeholder="••••••••"
                />
                <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={isLoading}
              className="sp-btn-brand sp-btn-full"
              style={{ marginTop: '0.5rem', padding: '0.875rem' }}
            >
              {isLoading ? <span className="sp-spinner" /> : <>เข้าสู่ระบบ <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="sp-animate-d3" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="sp-link">สมัครสมาชิก</Link>
            </p>
          </div>

          <div className="sp-divider" style={{ marginTop: '2rem' }} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/merchant/login">
              <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>เข้าสู่ระบบร้านค้า</button>
            </Link>
            <Link href="/driver/login">
              <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>เข้าสู่ระบบคนขับ</button>
            </Link>
          </div>
        </div>
      </div>

      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
        <div>
          <p className="sp-caps" style={{ color: 'var(--brand-400)', marginBottom: '1rem' }}>Personal Courier</p>
          <p className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-50)', lineHeight: 1.1 }}>
            ส่งง่าย สบายใจ<br />ถึงไวทุกออเดอร์
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: '32ch' }}>
            ระบบคำนวณราคาโปร่งใส และประกันภัยสินค้าทุกรายการเพื่อความปลอดภัยสูงสุด
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>LIVE</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>Tracking</p>
          </div>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>Free</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>Insurance</p>
          </div>
        </div>
      </div>
    </div>
  );
}