'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, ArrowRight, CheckCircle, Truck, Info } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function DriverProfilePage() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');

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
    if (!role || role !== 'Driver') {
      router.push('/login');
      return;
    }
    
    try {
      const res = await fetch('/api/proxy/users/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setVehiclePlate(data.vehiclePlate || '');
        setVehicleType(data.vehicleType || '');
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
        body: JSON.stringify({ name, phone, vehiclePlate, vehicleType }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('อัปเดตข้อมูลสำเร็จ');
        setProfile({ ...profile, name: data.name, phone: data.phone, vehiclePlate: data.vehiclePlate, vehicleType: data.vehicleType });
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
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span> <span className="text-xs py-0.5 px-1.5 bg-[var(--brand-100)] text-[var(--brand-700)] rounded-full ml-2 align-middle">Driver</span></span>
        <button className="sp-btn-ghost text-[var(--danger-500)] text-sm" onClick={handleLogout}>
          ออกจากระบบ
        </button>
      </nav>

      <main className="max-w-[480px] mx-auto py-12 px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)]">
            <Truck size={36} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg font-black">โปรไฟล์คนขับ</h1>
          <p className="text-[var(--n-500)] mt-2">
            จัดการข้อมูลส่วนตัวและยานพาหนะ
          </p>
        </div>

        {loading ? (
          <div className="sp-page-loading"><span className="sp-spinner" /></div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="sp-card sp-animate">
              <div className="flex items-center gap-2 mb-6 p-3 bg-[var(--success-50)] text-[var(--success-700)] rounded-xl text-sm font-semibold">
                <CheckCircle size={18} /> ยืนยันตัวตนสำเร็จแล้ว (Driver)
              </div>

              {/* ข้อมูลที่แก้ไขไม่ได้ */}
              <div className="flex gap-4 mb-5">
                <div className="flex-1">
                  <label className="sp-label mb-2 block">อีเมล</label>
                  <input type="email" value={profile?.email} className="sp-input w-full bg-[var(--n-50)] text-[var(--n-500)]" disabled />
                </div>
                {profile?.nationalId && (
                  <div className="flex-1">
                    <label className="sp-label mb-2 block">เลขบัตรประชาชน</label>
                    <input type="text" value={profile?.nationalId} className="sp-input w-full bg-[var(--n-50)] text-[var(--n-500)]" disabled />
                  </div>
                )}
              </div>

              {/* ข้อมูลที่แก้ไขได้ */}
              <label className="sp-label mb-2 block">ชื่อ-นามสกุล</label>
              <div className="relative mb-5">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--n-500)]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="sp-input pl-11 w-full"
                  placeholder="กรอกชื่อของคุณ"
                  required
                />
              </div>

              <label className="sp-label mb-2 block">เบอร์โทรศัพท์</label>
              <div className="relative mb-5">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--n-500)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="sp-input pl-11 w-full"
                  placeholder="08XXXXXXXX"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="sp-label mb-2 block">ประเภทรถ</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="sp-input w-full"
                  >
                    <option value="">-- เลือกประเภทรถ --</option>
                    <option value="มอเตอร์ไซค์">มอเตอร์ไซค์</option>
                    <option value="รถกระบะ">รถกระบะ</option>
                    <option value="รถตู้ทึบ">รถตู้ทึบ</option>
                  </select>
                </div>
                <div>
                  <label className="sp-label mb-2 block">ป้ายทะเบียน</label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="sp-input w-full"
                    placeholder="เช่น 1กข 1234"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="sp-btn-brand sp-btn-full py-3.5"
              >
                {saving ? <span className="sp-spinner" /> : (
                  <>บันทึกข้อมูลส่วนตัว <ArrowRight size={16} /></>
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
                className="sp-btn-ghost sp-btn-full py-3.5 bg-[var(--n-100)]"
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
