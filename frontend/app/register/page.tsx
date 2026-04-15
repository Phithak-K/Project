'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (form.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: 'Customer' }),
      });

      let data: any = {};
      try { data = await response.json(); } catch { data = {}; }

      if (response.ok) {
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        window.location.href = `https://app.${baseDomain}/verify-otp?email=${encodeURIComponent(form.email)}`;
      } else {
        setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'ข้อมูลไม่ถูกต้อง');
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
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
            <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          </div>

          <div className="sp-animate-d1" style={{ marginBottom: '2rem' }}>
            <span className="sp-section-eyebrow">สมัครสมาชิก</span>
            <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900 }}>สร้างบัญชีผู้ใช้</h1>
            <p style={{ color: 'var(--n-500)', marginTop: '0.375rem', fontSize: '0.9rem' }}>
              เข้าร่วมเครือข่าย SwiftPath วันนี้
            </p>
          </div>

          {error && (
            <div className="sp-alert sp-alert-error sp-animate" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="sp-field">
              <label className="sp-label">ชื่อ - นามสกุล</label>
              <input id="name" type="text" required value={form.name} onChange={set('name')} className="sp-input" placeholder="สมชาย ใจดี" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="sp-field">
                <label className="sp-label">เบอร์โทรศัพท์</label>
                <input id="phone" type="tel" required value={form.phone} onChange={set('phone')} className="sp-input" placeholder="0812345678" />
              </div>
              <div className="sp-field">
                <label className="sp-label">อีเมล</label>
                <input id="email" type="email" required value={form.email} onChange={set('email')} className="sp-input" placeholder="name@email.com" />
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">รหัสผ่าน</label>
              <div className="sp-input-wrap">
                <input id="password" type={showPw ? 'text' : 'password'} required minLength={6} value={form.password} onChange={set('password')} className="sp-input" placeholder="รหัสผ่าน 6 ตัวขึ้นไป" />
                <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">ยืนยันรหัสผ่าน</label>
              <input id="confirm-password" type={showPw ? 'text' : 'password'} required value={form.confirmPassword} onChange={set('confirmPassword')} className="sp-input" placeholder="พิมพ์รหัสผ่านอีกครั้ง" />
            </div>

            <button id="btn-register" type="submit" disabled={isLoading} className="sp-btn-primary sp-btn-full" style={{ marginTop: '0.5rem', padding: '0.875rem' }}>
              {isLoading ? <span className="sp-spinner" /> : <>ลงทะเบียน <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="sp-animate-d3" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              เป็นสมาชิกอยู่แล้ว?{' '}
              <Link href="/login" className="sp-link">เข้าสู่ระบบ</Link>
            </p>
          </div>

          <div className="sp-divider" style={{ marginTop: '1.5rem' }} />

          <div>
            <p className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '0.75rem' }}>สมัครในฐานะอื่น</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/merchant/register">
                <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>เปิดร้านค้า</button>
              </Link>
              <Link href="/driver/register">
                <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>สมัครคนขับ</button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Brand Panel ── */}
      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
        <div>
          <p className="sp-caps" style={{ color: 'var(--brand-400)', marginBottom: '1rem' }}>เริ่มต้นฟรี</p>
          <p className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-50)', lineHeight: 1.1 }}>
            เปิดบัญชีใน<br />ไม่กี่วินาที
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: '32ch' }}>
            ไม่ต้องใช้บัตรเครดิต ไม่มีค่าธรรมเนียมรายเดือน เริ่มใช้งานได้ทันทีหลังยืนยันอีเมล
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>3</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>กลุ่มผู้ใช้</p>
          </div>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>Live</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>Real-time Tracking</p>
          </div>
        </div>
      </div>
    </div>
  );
}