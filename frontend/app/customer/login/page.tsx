'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { FaFacebook, FaLine } from 'react-icons/fa';

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

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenResponse.access_token }),
      });
      const data = await response.json();
      if (response.ok) {
        document.cookie = `token=${data.access_token}; path=/; max-age=86400;`;
        document.cookie = `role=${data.user?.role || 'Customer'}; path=/; max-age=86400;`;
        window.location.href = `https://app.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/`;
      } else {
        setErrorMsg(data.message || 'Google Login Failed');
      }
    } catch {
       setErrorMsg('ไม่สามารถเชื่อมต่อกับระบบได้');
    } finally {
       setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setErrorMsg('Google Login Error'),
  });

  const handleFacebookLogin = () => {
    alert("Facebook Login is currently in sandbox mode. Please configure App ID in .env.local");
  };

  const handleLineLogin = () => {
    alert("LINE Login is currently in sandbox mode. Please configure Channel ID in .env.local");
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
              {isLoading ? <span className="sp-spinner" /> : <>เข้าสู่ระบบด้วยอีเมล <ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--n-200)' }}></div>
            <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--n-400)' }} className="sp-caps">หรือเข้าสู่ระบบด้วย</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--n-200)' }}></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
             <button onClick={() => loginWithGoogle()} className="sp-btn-ghost" style={{ border: '1px solid var(--n-200)', color: 'var(--n-700)', padding: '0.6rem' }} title="Google">
               <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
               </svg>
             </button>
             <button onClick={handleFacebookLogin} type="button" className="sp-btn-ghost" style={{ border: '1px solid var(--n-200)', color: '#1877F2', padding: '0.6rem' }} title="Facebook">
                <FaFacebook size={20} />
             </button>
             <button onClick={handleLineLogin} type="button" className="sp-btn-ghost" style={{ border: '1px solid var(--n-200)', color: '#00C300', padding: '0.6rem' }} title="LINE">
                <FaLine size={20} />
             </button>
          </div>

          <div className="sp-animate-d3">
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              ยังไม่มีบัญชี?{' '}
              <Link href="/customer/register" className="sp-link">สมัครสมาชิก</Link>
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