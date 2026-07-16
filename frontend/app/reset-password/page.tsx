'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, ShieldCheck, Mail, KeyRound } from 'lucide-react';
import { toast } from 'react-hot-toast';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'ตั้งรหัสผ่านใหม่สำเร็จ');
        router.push('/login');
      } else {
        toast.error(data.message || 'ไม่สามารถตั้งรหัสผ่านใหม่ได้');
      }
    } catch (error) {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sp-card sp-animate">
      <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>อีเมล</label>
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
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

      <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>รหัส OTP จากอีเมล</label>
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <ShieldCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="sp-input"
          style={{ paddingLeft: '2.75rem', width: '100%', letterSpacing: '2px' }}
          placeholder="XXXXXX"
          maxLength={6}
          required
        />
      </div>

      <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>รหัสผ่านใหม่</label>
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="sp-input"
          style={{ paddingLeft: '2.75rem', width: '100%' }}
          placeholder="••••••••"
          minLength={6}
          required
        />
      </div>

      <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>ยืนยันรหัสผ่านใหม่</label>
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="sp-input"
          style={{ paddingLeft: '2.75rem', width: '100%' }}
          placeholder="••••••••"
          minLength={6}
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
          <>ตั้งรหัสผ่านใหม่ <ArrowRight size={16} /></>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            <Lock size={28} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>ตั้งรหัสผ่านใหม่</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            กรอกรหัส OTP ที่ได้รับทางอีเมล และตั้งรหัสผ่านใหม่ของคุณ
          </p>
        </div>

        <Suspense fallback={<div className="sp-page-loading"><span className="sp-spinner" /></div>}>
          <ResetPasswordForm />
        </Suspense>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/login" className="sp-link-muted" style={{ fontSize: '0.875rem' }}>
            ← กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </main>
    </div>
  );
}
