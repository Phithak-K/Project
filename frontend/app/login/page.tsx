'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import { handleLoginCallback } from '@/lib/auth';

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'Customer' }),
      });
      const data = await response.json();

      if (response.ok) {
        const { redirectUrl } = await handleLoginCallback(data);
        window.location.href = redirectUrl;
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
    <div className="sp-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(2rem, 6vw, 6rem)', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        
        <div className="sp-animate" style={{ marginBottom: '4rem' }}>
          <span className="sp-logo-dark" style={{ fontSize: '1.5rem' }}>Swift<span className="sp-logo-accent">Path</span></span>
          <div style={{ width: '40px', height: '4px', background: 'var(--brand-500)', marginTop: '0.5rem' }}></div>
        </div>

        <div className="sp-animate-d1" style={{ marginBottom: '3rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>GLOBAL ACCESS</span>
          <h1 className="sp-font-display" style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1, marginTop: '0.5rem', letterSpacing: '-0.02em', color: 'var(--n-900)' }}>
            เข้าสู่ระบบ<br />รวม
          </h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }}>
            จัดการพัสดุและติดตามการขนส่งแบบเรียลไทม์
          </p>
        </div>

        {error && (
          <div className="sp-animate" style={{ padding: '1rem', borderLeft: '4px solid var(--error-text)', background: 'var(--n-50)', color: 'var(--n-900)', marginBottom: '2rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <label className="sp-caps" style={{ display: 'block', color: 'var(--n-400)', marginBottom: '0.5rem' }}>อีเมล หรือ USERNAME</label>
            <input 
              id="customer-email"
              type="text" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="sp-input" 
              placeholder="กรอกอีเมล หรือ Username" 
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <label className="sp-caps" style={{ color: 'var(--n-400)' }}>รหัสผ่าน</label>
              <Link href="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--n-400)', fontWeight: 600, textDecoration: 'underline' }}>ลืมรหัสผ่าน?</Link>
            </div>
            <div className="sp-input-wrap">
              <input 
                id="customer-password"
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

          <button id="btn-login-submit" type="submit" disabled={isLoading} className="sp-btn-primary" style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            {isLoading ? <span className="sp-spinner" /> : <span>เข้าสู่ระบบ</span>}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="sp-animate-d3" style={{ marginTop: '3rem', borderTop: '1px solid var(--n-200)', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--n-500)', fontWeight: 500 }}>
            ยังไม่ได้สมัคร? <Link href="/register" style={{ color: 'var(--n-900)', fontWeight: 700, textDecoration: 'underline' }}>สมัครสมาชิก</Link>
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
            <a href={`//store.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`} style={{ fontSize: '0.75rem', color: 'var(--n-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>สำหรับร้านค้า &rarr;</a>
            <a href={`//fleet.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`} style={{ fontSize: '0.75rem', color: 'var(--n-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>สำหรับคนขับ &rarr;</a>
          </div>
        </div>
      </main>
    </div>
  );
}
