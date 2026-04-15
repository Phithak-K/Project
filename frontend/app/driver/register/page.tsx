'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function DriverRegisterPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', confirmPassword: '', vehiclePlate: '', vehicleType: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, phone: form.phone, email: form.email,
          password: form.password, role: 'Driver',
          vehiclePlate: form.vehiclePlate, vehicleType: form.vehicleType
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        window.location.href = `https://fleet.${baseDomain}/verify-otp?email=${encodeURIComponent(form.email)}`;
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
            <span className="sp-section-eyebrow">สมัครคนขับ</span>
            <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900 }}>ร่วมทีมกับเรา</h1>
            <p style={{ color: 'var(--n-500)', marginTop: '0.375rem', fontSize: '0.9rem' }}>สมัครเป็น Partner Driver ของ SwiftPath</p>
          </div>

          {error && <div className="sp-alert sp-alert-error sp-animate" style={{ marginBottom: '1.25rem' }}>{error}</div>}

          <form onSubmit={handleRegister} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="sp-field">
              <label className="sp-label">ชื่อ - นามสกุล</label>
              <input id="driver-name" type="text" required value={form.name} onChange={set('name')} className="sp-input" placeholder="สมชาย ใจดี" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="sp-field">
                <label className="sp-label">เบอร์โทรศัพท์</label>
                <input id="driver-phone" type="tel" required value={form.phone} onChange={set('phone')} className="sp-input" placeholder="08XXXXXXXX" />
              </div>
              <div className="sp-field">
                <label className="sp-label">อีเมล</label>
                <input id="driver-email" type="email" required value={form.email} onChange={set('email')} className="sp-input" placeholder="driver@email.com" />
              </div>
            </div>

            {/* Vehicle info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="sp-field">
                <label className="sp-label">ทะเบียนรถ</label>
                <input id="driver-plate" type="text" required value={form.vehiclePlate} onChange={set('vehiclePlate')} className="sp-input" placeholder="กข 1234" />
              </div>
              <div className="sp-field">
                <label className="sp-label">ประเภทรถ</label>
                <select
                  id="driver-vehicle-type"
                  value={form.vehicleType}
                  onChange={set('vehicleType') as any}
                  className="sp-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">เลือกประเภท</option>
                  <option value="motorcycle">มอเตอร์ไซค์</option>
                  <option value="car">รถยนต์</option>
                  <option value="van">รถตู้</option>
                  <option value="truck">รถบรรทุก</option>
                </select>
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">รหัสผ่าน</label>
              <div className="sp-input-wrap">
                <input id="driver-password" type={showPw ? 'text' : 'password'} required minLength={6} value={form.password} onChange={set('password')} className="sp-input" placeholder="6 ตัวขึ้นไป" />
                <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">ยืนยันรหัสผ่าน</label>
              <input id="driver-confirm-password" type={showPw ? 'text' : 'password'} required value={form.confirmPassword} onChange={set('confirmPassword')} className="sp-input" placeholder="พิมพ์รหัสผ่านอีกครั้ง" />
            </div>

            <button id="btn-driver-register" type="submit" disabled={isLoading} className="sp-btn-primary sp-btn-full" style={{ padding: '0.875rem' }}>
              {isLoading ? <span className="sp-spinner" /> : <>สมัครเป็นพาร์ทเนอร์คนขับ <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="sp-animate-d3" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
              เป็นคนขับอยู่แล้ว?{' '}
              <Link href="/driver/login" className="sp-link">เข้าสู่ระบบ</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="sp-auth-brand-panel">
        <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
        <div>
          <p className="sp-caps" style={{ color: 'var(--brand-400)', marginBottom: '1rem' }}>รายได้ดี ยืดหยุ่น</p>
          <p className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-50)', lineHeight: 1.1 }}>
            ทำงาน<br />ตามเวลาคุณ
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--n-500)', fontSize: '0.9rem', maxWidth: '32ch' }}>
            รับงานเมื่อพร้อม ปฏิเสธได้ตลอด มีระบบ Surge Pricing ช่วยเพิ่มรายได้ในวันที่อากาศไม่ดี
          </p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>+20%</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>Rainy Day Bonus</p>
          </div>
          <div>
            <p className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>COD</p>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>รองรับเก็บเงินปลายทาง</p>
          </div>
        </div>
      </div>
    </div>
  );
}