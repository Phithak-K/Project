'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Phone, Mail, ArrowRight, CheckCircle, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function MerchantProfilePage() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchProfile = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Merchant') {
      router.push('/login');
      return;
    }
    
    try {
      const res = await fetch('/api/proxy/users/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
        setStoreName(data.storeName || '');
        setPhone(data.phone || '');
      } else {
        toast.error('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, storeName, phone }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('อัปเดตข้อมูลร้านค้าสำเร็จ');
        setProfile({ ...profile, name: data.name, storeName: data.storeName, phone: data.phone });
      } else {
        toast.error(data.message || 'ไม่สามารถอัปเดตข้อมูลได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/proxy/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
        setOldPassword('');
        setNewPassword('');
      } else {
        toast.error(data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <Link href="/" className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          ← กลับหน้า Dashboard
        </Link>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span> <span style={{fontSize: '0.75rem', padding: '0.125rem 0.375rem', background: 'var(--brand-100)', color: 'var(--brand-700)', borderRadius: '1rem', marginLeft: '0.5rem', verticalAlign: 'middle'}}>Store</span></span>
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
            <Store size={36} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>โปรไฟล์ร้านค้า</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.5rem' }}>
            จัดการข้อมูลร้านค้าและการตั้งค่าบัญชี
          </p>
        </div>

        {loading ? (
          <div className="sp-page-loading"><span className="sp-spinner" /></div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="sp-card sp-animate">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--success-50)', color: 'var(--success-700)', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                <CheckCircle size={18} /> ยืนยันตัวตนสำเร็จแล้ว (Merchant)
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

              <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>ชื่อร้านค้า</label>
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <Store size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="sp-input"
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                  placeholder="กรอกชื่อร้านค้าของคุณ"
                  required
                />
              </div>

              <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>ชื่อ-นามสกุล (เจ้าของร้าน)</label>
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="sp-input"
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                  placeholder="กรอกชื่อ-นามสกุลของคุณ"
                  required
                />
              </div>

              <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>เบอร์โทรศัพท์ร้านค้า</label>
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
                  <>บันทึกข้อมูลร้านค้า <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <form onSubmit={handlePasswordSubmit} className="sp-card sp-animate" style={{ marginTop: '2rem' }}>
              <h2 className="sp-font-display sp-text-md" style={{ marginBottom: '1.25rem' }}>เปลี่ยนรหัสผ่าน</h2>
              
              <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>รหัสผ่านเดิม</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="sp-input"
                style={{ width: '100%', marginBottom: '1.25rem' }}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                required
              />

              <label className="sp-label" style={{ marginBottom: '0.5rem', display: 'block' }}>รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="sp-input"
                style={{ width: '100%', marginBottom: '2rem' }}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                required
                minLength={6}
              />

              <button
                type="submit"
                disabled={passwordSaving || !oldPassword || !newPassword}
                className="sp-btn-ghost sp-btn-full"
                style={{ padding: '0.875rem', background: 'var(--n-100)' }}
              >
                {passwordSaving ? <span className="sp-spinner" /> : 'ยืนยันเปลี่ยนรหัสผ่าน'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
