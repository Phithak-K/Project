'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'Admin' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ'); return; }

      const { access_token, user } = data;
      const past = new Date(Date.now() + 86400000 * 7).toUTCString();
      document.cookie = `token=${access_token}; path=/; expires=${past}`;
      document.cookie = `role=${user.role}; path=/; expires=${past}`;
      router.push('/admin');
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--n-950, #09090b)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'oklch(65% 0.18 30)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1rem'
          }}>
            <Shield size={26} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            Swift<span style={{ color: 'oklch(65% 0.18 30)' }}>Path</span> Admin
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            Control Center — Authorized Access Only
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#18181b', border: '1px solid #27272a',
          borderRadius: '16px', padding: '2rem'
        }}>
          <form id="form-admin-login" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@swiftpath.com"
                style={{
                  width: '100%', background: '#09090b', border: '1px solid #3f3f46',
                  borderRadius: '10px', padding: '0.75rem 1rem', color: '#f4f4f5',
                  fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••••••"
                style={{
                  width: '100%', background: '#09090b', border: '1px solid #3f3f46',
                  borderRadius: '10px', padding: '0.75rem 1rem', color: '#f4f4f5',
                  fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'oklch(25% 0.08 0)', border: '1px solid oklch(40% 0.12 0)',
                borderRadius: '8px', padding: '0.75rem 1rem', color: 'oklch(72% 0.18 20)',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <button
              id="btn-admin-login"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '10px',
                background: loading ? '#3f3f46' : 'oklch(65% 0.18 30)',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'background 0.15s',
              }}
            >
              <Lock size={15} />
              {loading ? 'กำลังยืนยันตัวตน...' : 'เข้าสู่ระบบ Admin'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#3f3f46', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          SwiftPath Control Center — Zero-Trust Security
        </p>
      </div>
    </div>
  );
}
