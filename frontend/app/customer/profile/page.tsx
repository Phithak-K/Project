'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAuthToken = useCallback(() => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
      } else {
        toast.error('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  }, [API_URL, router, getAuthToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name, phone }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('อัปเดตข้อมูลส่วนตัวสำเร็จ');
        setProfile({ ...profile, name: data.name, phone: data.phone });
      } else {
        toast.error(data.message || 'ไม่สามารถอัปเดตข้อมูลได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <Link href="/" className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          ← หน้าหลัก
        </Link>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <button className="sp-btn-ghost" style={{ color: 'var(--danger-500)', fontSize: '0.875rem' }} onClick={handleLogout}>
          ออกจากระบบ
        </button>
      </nav>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', boxShadow: '0 8px 24px -4px rgba(234,88,12,0.4)'
          }}>
            <User size={36} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>โปรไฟล์ส่วนตัว</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.5rem' }}>
            จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี
          </p>
        </div>

        {loading ? (
          <div className="sp-page-loading"><span className="sp-spinner" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="sp-card sp-animate">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--success-50)', color: 'var(--success-700)', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
              <CheckCircle size={18} /> ยืนยันตัวตนสำเร็จแล้ว
            </div>

            <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>อีเมล (ไม่สามารถแก้ไขได้)</label>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
              <input
                type="email"
                value={profile?.email}
                className="sp-input"
                style={{ paddingLeft: '2.75rem', width: '100%', background: 'var(--n-50)', color: 'var(--n-500)' }}
                disabled
              />
            </div>

            <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>ชื่อ-นามสกุล</label>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sp-input"
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                placeholder="กรอกชื่อของคุณ"
                required
              />
            </div>

            <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>เบอร์โทรศัพท์</label>
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="sp-input"
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                placeholder="08XXXXXXXX"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="sp-btn-brand sp-btn-full"
              style={{ padding: '0.875rem' }}
            >
              {saving ? <span className="sp-spinner" /> : (
                <>บันทึกการเปลี่ยนแปลง <ArrowRight size={16} /></>
              )}
            </button>
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Link href="/forgot-password" className="sp-link-muted" style={{ fontSize: '0.875rem' }}>
                ต้องการเปลี่ยนรหัสผ่าน?
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
