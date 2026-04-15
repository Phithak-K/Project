'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function MerchantRegisterPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }
    if (!agreeTerms) { setError('กรุณายอมรับเงื่อนไขการใช้บริการ'); return; }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, password: form.password, role: 'Merchant' }),
      });
      const data = await response.json();
      if (response.ok) {
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        window.location.href = `https://store.${baseDomain}/verify-otp?email=${encodeURIComponent(form.email)}`;
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
      <div className="sp-auth-form-panel">
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
            <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          </div>

          <div className="sp-animate-d1" style={{ marginBottom: '2rem' }}>
            <span className="sp-section-eyebrow">เปิดร้านค้า</span>
            <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900 }}>ลงทะเบียนร้านค้า</h1>
            <p style={{ color: 'var(--n-500)', marginTop: '0.375rem', fontSize: '0.9rem' }}>เข้าร่วมเครือข่าย Merchant ของ SwiftPath</p>
          </div>

          {error && <div className="sp-alert sp-alert-error sp-animate" style={{ marginBottom: '1.25rem' }}>{error}</div>}

          <form onSubmit={handleRegister} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="sp-field">
              <label className="sp-label">ชื่อร้านค้า / ชื่อผู้ติดต่อ</label>
              <input id="merchant-name" type="text" required value={form.name} onChange={set('name')} className="sp-input" placeholder="ร้านสมใจ ขนส่ง" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="sp-field">
                <label className="sp-label">เบอร์โทรศัพท์</label>
                <input id="merchant-phone" type="tel" required value={form.phone} onChange={set('phone')} className="sp-input" placeholder="081XXXXXXX" />
              </div>
              <div className="sp-field">
                <label className="sp-label">อีเมลธุรกิจ</label>
                <input id="merchant-email" type="email" required value={form.email} onChange={set('email')} className="sp-input" placeholder="your@email.com" />
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">รหัสผ่าน</label>
              <div className="sp-input-wrap">
                <input id="merchant-password" type={showPw ? 'text' : 'password'} required minLength={6} value={form.password} onChange={set('password')} className="sp-input" placeholder="6 ตัวขึ้นไป" />
                <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">ยืนยันรหัสผ่าน</label>
              <input id="merchant-confirm-password" type={showPw ? 'text' : 'password'} required value={form.confirmPassword} onChange={set('confirmPassword')} className="sp-input" placeholder="พิมพ์รหัสผ่านอีกครั้ง" />
            </div>

            <div className="sp-checkbox">
              <input type="checkbox" id="terms" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
              <label className="sp-checkbox-label" htmlFor="terms">
                ฉันยอมรับ <a href="#">เงื่อนไขการให้บริการ</a> และนโยบายของ SwiftPath
              </label>
            </div>

            <button id="btn-merchant-register" type="submit" disabled={isLoading} className="sp-btn-primary sp-btn-full" style={{ padding: '0.875rem' }}>
              {isLoading ? <span className="sp-spinner" /> : <>สมัครเปิดร้านค้า <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="sp-animate-d3" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="sp-link">เข้าสู่ระบบ</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
        <div>
          <p className="sp-caps" style={{ color: 'var(--brand-400)', marginBottom: '1rem' }}>เพิ่มยอดขาย</p>
          <p className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-50)', lineHeight: 1.1 }}>
            ขายได้มากขึ้น<br />ส่งได้เร็วขึ้น
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: '32ch' }}>
            ระบบ Surge Pricing ช่วยให้คนขับมาหาคุณเร็วขึ้นในชั่วโมงเร่งด่วน
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>Auto</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>Surge Pricing</p>
          </div>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>PDF</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>รายงานยอดขาย</p>
          </div>
        </div>
      </div>
    </div>
  );
}