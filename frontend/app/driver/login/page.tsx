'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { handleLoginCallback } from '@/lib/auth';

export default function DriverLoginPage() {
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
      // [SEC-01 FIX] Route through Next.js proxy — backend URL never exposed to browser
      const response = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'Driver' }),
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
    <div className="sp-page min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col justify-center w-full max-w-[600px] mx-auto p-8 sm:p-12 md:p-16">
        
        <div className="sp-animate mb-16">
          <span className="sp-logo text-2xl">Swift<span className="sp-logo-accent">Path</span></span>
          <div className="w-10 h-1 bg-[var(--brand-500)] mt-2" />
        </div>

        <div className="sp-animate-d1 mb-12">
          <span className="sp-section-eyebrow text-[var(--brand-500)]">FLEET PORTAL</span>
          <h1 className="sp-font-display font-black text-4xl sm:text-5xl md:text-6xl leading-none mt-2 tracking-tight text-[var(--n-900)]">
            ล็อกอิน<br />คนขับรถ
          </h1>
          <p className="text-[var(--n-500)] mt-3 text-sm font-medium">
            รับงาน ติดตามเส้นทาง และรับรายได้
          </p>
        </div>

        {error && (
          <div className="sp-animate p-4 border-l-4 border-l-[var(--error-text)] bg-[var(--n-50)] text-[var(--n-900)] mb-8 text-sm shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="sp-animate-d2 flex flex-col gap-8">
          
          <div>
            <label className="sp-caps block text-[var(--n-500)] mb-2">อีเมล หรือ USERNAME</label>
            <input 
              id="driver-email"
              type="text" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="sp-input" 
              placeholder="กรอกอีเมล หรือ Username" 
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="sp-caps text-[var(--n-500)]">รหัสผ่าน</label>
              <Link href="/forgot-password" className="text-xs text-[var(--n-500)] font-semibold underline">ลืมรหัสผ่าน?</Link>
            </div>
            <div className="sp-input-wrap">
              <input 
                id="driver-password"
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

          <button id="btn-driver-login" type="submit" disabled={isLoading} className="sp-btn-primary mt-4 w-full flex justify-between items-center">
            {isLoading ? <span className="sp-spinner" /> : <span>เข้าสู่ระบบ</span>}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="sp-animate-d3 mt-12 border-t border-[var(--n-200)] pt-8">
          <p className="text-sm text-[var(--n-500)] font-medium">
            ยังไม่ได้สมัคร? <Link href="/register" className="text-[var(--n-900)] font-bold underline">สมัครเป็นคนขับ</Link>
          </p>
          <div className="flex gap-6 mt-6">
            <a href={`//app.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`} className="text-xs text-[var(--n-500)] uppercase font-bold tracking-wider hover:text-[var(--n-900)] transition-colors">สำหรับลูกค้า &rarr;</a>
            <a href={`//store.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`} className="text-xs text-[var(--n-500)] uppercase font-bold tracking-wider hover:text-[var(--n-900)] transition-colors">สำหรับร้านค้า &rarr;</a>
          </div>
        </div>
      </main>
    </div>
  );
}
