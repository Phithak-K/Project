'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'Admin' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ'); return; }

      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: data.access_token, user: data.user }),
      });
      router.push('/admin');
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(2rem, 6vw, 6rem)', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        
        <div className="sp-animate" style={{ marginBottom: '4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={28} style={{ color: 'var(--brand-500)' }} />
          <div>
            <span className="sp-logo" style={{ fontSize: '1.5rem' }}>Swift<span className="sp-logo-accent">Path</span></span>
            <div style={{ width: '40px', height: '4px', background: 'var(--brand-500)', marginTop: '0.25rem' }}></div>
          </div>
        </div>

        <div className="sp-animate-d1" style={{ marginBottom: '3rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>CONTROL CENTER</span>
          <h1 className="sp-font-display" style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1, marginTop: '0.5rem', letterSpacing: '-0.02em', color: 'var(--n-900)' }}>
            ผู้ดูแลระบบ
          </h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Authorized Access Only
          </p>
        </div>

        {error && (
          <div className="sp-animate" style={{ padding: '1rem', borderLeft: '4px solid var(--error-text)', background: 'var(--n-50)', color: 'var(--n-900)', marginBottom: '2rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <label className="sp-caps" style={{ display: 'block', color: 'var(--n-500)', marginBottom: '0.5rem' }}>Admin Email</label>
            <input 
              type="email" 
              required 
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
              className="sp-input" 
              placeholder="admin@swiftpath.com" 
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <label className="sp-caps" style={{ color: 'var(--n-500)' }}>Password</label>
            </div>
            <div className="sp-input-wrap">
              <input 
                type={showPw ? 'text' : 'password'} 
                required 
                value={form.password} 
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                className="sp-input" 
                placeholder="••••••••" 
              />
              <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="sp-btn-primary" style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            {loading ? <span className="sp-spinner" /> : <span>เข้าสู่ระบบ</span>}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

      </main>
    </div>
  );
}
