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
        <Link href="/" className="sp-link-muted flex items-center gap-2 text-sm">
          ← กลับหน้า Dashboard
        </Link>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span> <span className="text-xs px-1.5 py-0.5 bg-[var(--brand-100)] text-[var(--brand-700)] rounded-full ml-2 align-middle">Store</span></span>
        <button className="sp-btn-ghost text-[var(--danger-500)] text-sm" onClick={handleLogout}>
          ออกจากระบบ
        </button>
      </nav>

      <main className="max-w-[480px] mx-auto py-12 px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)]">
            <Store size={36} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg font-black">โปรไฟล์ร้านค้า</h1>
          <p className="text-[var(--n-500)] mt-2">
            จัดการข้อมูลร้านค้าและการตั้งค่าบัญชี
          </p>
        </div>

        {loading ? (
          <div className="sp-page-loading"><span className="sp-spinner" /></div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="sp-card sp-animate">
              <div className="flex items-center gap-2 mb-6 p-3 bg-[var(--success-50)] text-[var(--success-700)] rounded-xl text-sm font-semibold">
                <CheckCircle size={18} /> ยืนยันตัวตนสำเร็จแล้ว (Merchant)
              </div>

              <label className="sp-label mb-2 block">อีเมล (ไม่สามารถแก้ไขได้)</label>
              <div className="relative mb-5">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--n-400)]" />
                <input
                  type="email"
                  value={profile?.email}
                  className="sp-input pl-11 w-full bg-[var(--n-50)] text-[var(--n-500)]"
                  disabled
                />
              </div>

              <label className="sp-label mb-2 block">ชื่อร้านค้า</label>
              <div className="relative mb-5">
                <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--n-400)]" />
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="sp-input pl-11 w-full"
                  placeholder="กรอกชื่อร้านค้าของคุณ"
                  required
                />
              </div>

              <label className="sp-label mb-2 block">ชื่อ-นามสกุล (เจ้าของร้าน)</label>
              <div className="relative mb-5">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--n-400)]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="sp-input pl-11 w-full"
                  placeholder="กรอกชื่อ-นามสกุลของคุณ"
                  required
                />
              </div>

              <label className="sp-label mb-2 block">เบอร์โทรศัพท์ร้านค้า</label>
              <div className="relative mb-8">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--n-400)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="sp-input pl-11 w-full"
                  placeholder="08XXXXXXXX"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="sp-btn-brand sp-btn-full p-3.5"
              >
                {saving ? <span className="sp-spinner" /> : (
                  <>บันทึกข้อมูลร้านค้า <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <form onSubmit={handlePasswordSubmit} className="sp-card sp-animate mt-8">
              <h2 className="sp-font-display sp-text-md mb-5">เปลี่ยนรหัสผ่าน</h2>
              
              <label className="sp-label mb-2 block">รหัสผ่านเดิม</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="sp-input w-full mb-5"
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                required
              />

              <label className="sp-label mb-2 block">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="sp-input w-full mb-8"
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                required
                minLength={6}
              />

              <button
                type="submit"
                disabled={passwordSaving || !oldPassword || !newPassword}
                className="sp-btn-ghost sp-btn-full p-3.5 bg-[var(--n-100)]"
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
