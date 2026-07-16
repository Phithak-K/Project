'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'ส่งรหัสรีเซ็ตไปที่อีเมลแล้ว');
        // ส่ง email ไปเป็น query param เพื่อให้ผู้ใช้ไม่ต้องกรอกซ้ำในหน้าถัดไป
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(data.message || 'ไม่สามารถส่งอีเมลได้');
      }
    } catch (error) {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <main style={{ width: '100%', maxWidth: '420px', padding: '2rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '1.25rem',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', boxShadow: '0 8px 24px -4px rgba(234,88,12,0.4)'
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>ลืมรหัสผ่าน?</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            กรอกอีเมลของคุณที่ใช้ลงทะเบียน เพื่อรับรหัส OTP สำหรับตั้งค่ารหัสผ่านใหม่
          </p>
        </div>

        <form onSubmit={handleSubmit} className="sp-card sp-animate">
          <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>อีเมล (Email)</label>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sp-input"
              style={{ paddingLeft: '2.75rem', width: '100%' }}
              placeholder="name@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sp-btn-brand sp-btn-full"
            style={{ padding: '0.875rem' }}
          >
            {loading ? <span className="sp-spinner" /> : (
              <>รับรหัส OTP <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/login" className="sp-link-muted" style={{ fontSize: '0.875rem' }}>
            ← กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </main>
    </div>
  );
}
