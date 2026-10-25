'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function MerchantRegisterPage() {
  const [form, setForm] = useState({ storeName: '', storeAddress: '', firstName: '', lastName: '', nationalId: '', username: '', phone: '', email: '', password: '', confirmPassword: '' });
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storeName: form.storeName, 
          storeAddress: form.storeAddress,
          firstName: form.firstName,
          lastName: form.lastName,
          nationalId: form.nationalId,
          username: form.username,
          phone: form.phone, 
          email: form.email, 
          password: form.password, 
          role: 'Merchant' 
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const proto = baseDomain.includes('localhost') ? 'http' : 'https';
        window.location.href = `${proto}://store.${baseDomain}/verify-otp?email=${encodeURIComponent(form.email)}`;
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
        <div className="max-w-[420px] w-full">
          <div className="sp-animate mb-10">
            <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          </div>

          <div className="sp-animate-d1 mb-8">
            <span className="sp-section-eyebrow">เปิดร้านค้า</span>
            <h1 className="sp-font-display sp-text-xl font-black">ลงทะเบียนร้านค้า</h1>
            <p className="text-[var(--n-500)] mt-1.5 text-sm">เข้าร่วมเครือข่าย Merchant ของ SwiftPath</p>
          </div>

          {error && <div className="sp-alert sp-alert-error sp-animate mb-5">{error}</div>}

          <form onSubmit={handleRegister} className="sp-animate-d2 flex flex-col gap-4">
            <div className="sp-field">
              <label className="sp-label">ชื่อร้านค้า</label>
              <input id="merchant-store-name" type="text" required value={form.storeName} onChange={set('storeName')} className="sp-input" placeholder="ร้านสมใจ ขนส่ง" />
            </div>
            
            <div className="sp-field">
              <label className="sp-label">ที่อยู่ร้านค้า</label>
              <input id="merchant-store-address" type="text" required value={form.storeAddress} onChange={set('storeAddress')} className="sp-input" placeholder="123 ถ.สุขุมวิท กรุงเทพฯ" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="sp-field">
                <label className="sp-label">ชื่อผู้ติดต่อ</label>
                <input id="merchant-first-name" type="text" required value={form.firstName} onChange={set('firstName')} className="sp-input" placeholder="สมชาย" />
              </div>
              <div className="sp-field">
                <label className="sp-label">นามสกุล</label>
                <input id="merchant-last-name" type="text" required value={form.lastName} onChange={set('lastName')} className="sp-input" placeholder="ใจดี" />
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">เลขบัตรประชาชน</label>
              <input id="merchant-national-id" type="text" required minLength={13} maxLength={13} value={form.nationalId} onChange={set('nationalId')} className="sp-input" placeholder="เลขบัตรประชาชน 13 หลัก" />
            </div>

            <div className="sp-field">
              <label className="sp-label">Username (สำหรับล็อกอิน)</label>
              <input id="merchant-username" type="text" required minLength={4} maxLength={20} pattern="[a-zA-Z0-9_]+" value={form.username} onChange={set('username')} className="sp-input" placeholder="เช่น mystore_shop (a-z, 0-9, _)" autoComplete="username" />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                ฉันยอมรับ <button type="button" onClick={(e) => e.preventDefault()} className="bg-transparent border-none text-[var(--brand-500)] cursor-pointer p-0 font-inherit underline">เงื่อนไขการให้บริการ</button> และนโยบายของ SwiftPath
              </label>
            </div>

            <button id="btn-merchant-register" type="submit" disabled={isLoading} className="sp-btn-primary sp-btn-full py-3.5">
              {isLoading ? <span className="sp-spinner" /> : <>สมัครเปิดร้านค้า <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="sp-animate-d3 mt-6">
            <p className="text-sm text-[var(--n-500)]">
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="sp-link">เข้าสู่ระบบ</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
        <div>
          <p className="sp-caps text-[var(--brand-400)] mb-4">เพิ่มยอดขาย</p>
          <p className="sp-font-display sp-text-xl font-black text-[var(--n-50)] leading-tight">
            ขายได้มากขึ้น<br />ส่งได้เร็วขึ้น
          </p>
          <p className="mt-6 text-[var(--n-500)] text-sm max-w-[32ch]">
            ระบบ Surge Pricing ช่วยให้คนขับมาหาคุณเร็วขึ้นในชั่วโมงเร่งด่วน
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="sp-font-display text-3xl font-black text-[var(--n-50)]">Auto</p>
            <p className="sp-caps text-[var(--n-600)]">Surge Pricing</p>
          </div>
          <div>
            <p className="sp-font-display text-3xl font-black text-[var(--n-50)]">PDF</p>
            <p className="sp-caps text-[var(--n-600)]">รายงานยอดขาย</p>
          </div>
        </div>
      </div>
    </div>
  );
}
