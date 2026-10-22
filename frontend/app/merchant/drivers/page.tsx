'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck, UserPlus, UserMinus, Search, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PremiumModal from '@/components/PremiumModal';

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchContact, setSearchContact] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<number | null>(null);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'confirm'|'danger'|'prompt', title: string, message: string, onConfirm: (val?: string) => void }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });

  const getCookie = (name: string) => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  const fetchDrivers = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Merchant') { router.push('/merchant/login'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/users/my-drivers');
      if (res.ok) setDrivers(await res.json());
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleSearch = async () => {
    if (!searchContact.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/proxy/users/find-driver?contact=${encodeURIComponent(searchContact.trim())}`);
      if (res.ok) {
        setSearchResult(await res.json());
      } else {
        const err = await res.json();
        toast.error(err.message || 'ไม่พบคนขับจากข้อมูลที่ระบุ');
      }
    } catch { toast.error('Network Error'); }
    finally { setSearching(false); }
  };

  const handleLink = async () => {
    if (!searchResult) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/proxy/users/drivers/${searchResult.id}/link`, { method: 'PATCH' });
      if (res.ok) {
        toast.success(`เพิ่มคนขับ "${searchResult.name}" เข้าร้านเรียบร้อย`);
        setSearchResult(null);
        setSearchContact('');
        fetchDrivers();
      } else {
        const err = await res.json();
        toast.error(err.message || 'เพิ่มคนขับไม่สำเร็จ');
      }
    } catch { toast.error('Network Error'); }
    finally { setLinking(false); }
  };

  const handleUnlink = (driverId: number, driverName: string) => {
    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: 'ยืนยันการยกเลิก',
      message: `ยืนยันการยกเลิกความสัมพันธ์กับ "${driverName}" ใช่หรือไม่?`,
      onConfirm: async () => {
        setUnlinking(driverId);
        try {
          const res = await fetch(`/api/proxy/users/drivers/${driverId}/unlink`, { method: 'PATCH' });
          if (res.ok) {
            fetchDrivers();
          } else {
            const err = await res.json();
            toast.error(err.message || 'ยกเลิกไม่สำเร็จ');
          }
        } catch { toast.error('Network Error'); }
        finally { setUnlinking(null); }
      }
    });
  };

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted flex items-center gap-2 bg-transparent border-none text-sm cursor-pointer">
          <ArrowLeft size={16} /> กลับ Dashboard
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div className="w-20" />
      </nav>

      <main className="max-w-[760px] mx-auto py-10 px-6">
        <div className="sp-animate mb-10">
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg font-black">จัดการคนขับ</h1>
          <p className="text-[var(--n-500)] mt-1">เพิ่มและจัดการคนขับประจำร้านของคุณ</p>
        </div>

        {/* ── Add Driver Panel ── */}
        <div className="sp-card mb-8">
          <h3 className="sp-caps text-[var(--n-400)] mb-4 flex items-center gap-2">
            <UserPlus size={14} /> เพิ่มคนขับเข้าร้าน
          </h3>
          <p className="text-[var(--n-500)] text-[0.85rem] mb-4">
            ค้นหาด้วย <strong>email</strong> หรือ <strong>เบอร์โทร</strong> ของคนขับที่ลงทะเบียนในระบบแล้ว
          </p>
          <div className="flex gap-3 mb-4">
            <input
              type="text" value={searchContact}
              onChange={e => setSearchContact(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="sp-input flex-1"
              placeholder="email หรือ 08XXXXXXXX ของคนขับ"
            />
            <button onClick={handleSearch} disabled={searching} className="sp-btn-primary py-2.5 px-5 whitespace-nowrap">
              {searching ? <span className="sp-spinner" /> : <><Search size={15} /> ค้นหา</>}
            </button>
          </div>

          {searchResult && (
            <div className="p-4 border border-[var(--n-150)] rounded-xl flex justify-between items-center bg-[var(--n-50)]">
              <div>
                <div className="font-bold">{searchResult.name || 'ไม่ระบุชื่อ'}</div>
                <div className="text-[var(--n-500)] text-[0.8rem]">{searchResult.phone} · {searchResult.vehiclePlate || 'ไม่ระบุทะเบียน'}</div>
                {!searchResult.isVerified && (
                  <div className="flex items-center gap-1.5 text-[var(--warning-text)] text-[0.75rem] mt-1">
                    <AlertCircle size={13} /> คนขับยังไม่ยืนยันตัวตน
                  </div>
                )}
                {searchResult.merchantId && searchResult.merchantId !== null && (
                  <div className="flex items-center gap-1.5 text-[var(--warning-text)] text-[0.75rem] mt-1">
                    <AlertCircle size={13} /> คนขับนี้สังกัดร้านอื่นอยู่แล้ว
                  </div>
                )}
              </div>
              <button
                onClick={handleLink} disabled={linking || !searchResult.isVerified}
                className="sp-btn-primary py-2 px-4"
              >
                {linking ? <span className="sp-spinner" /> : <><UserPlus size={14} /> เพิ่มเข้าร้าน</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Driver List ── */}
        <div className="sp-card p-0 overflow-hidden">
          <div className="py-5 px-6 border-b border-[var(--n-150)] flex justify-between items-center">
            <h2 className="sp-section-title flex items-center gap-2">
              <Truck size={16} /> คนขับในร้าน
            </h2>
            <span className="sp-caps text-[var(--n-400)]">{drivers.length} คน</span>
          </div>

          {drivers.length === 0 ? (
            <div className="sp-empty-centered">
              <Truck size={28} className="sp-empty-icon" />
              <p className="sp-empty-title">ยังไม่มีคนขับ</p>
              <p className="sp-empty-body">ค้นหาและเพิ่มคนขับด้านบน</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {drivers.map(driver => (
                <div key={driver.id} className="flex justify-between items-center py-4 px-6 border-b border-[var(--n-100)]">
                  <div>
                    <div className="font-semibold">{driver.name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-[var(--n-500)] text-[0.8rem]">
                      📞 {driver.phone || '-'} · 🚗 {driver.vehiclePlate || '-'} ({driver.vehicleType || '-'})
                    </div>
                    <div className="mt-1.5 flex gap-1.5 items-center">
                      {driver.isVerified && (
                        <span className="flex items-center gap-1 text-[0.72rem] text-[var(--success-text)]">
                          <CheckCircle size={11} /> ยืนยันแล้ว
                        </span>
                      )}
                      {driver.isActive && (
                        <span className="sp-badge sp-badge-delivered text-[0.65rem] py-0.5 px-1.5">Active</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlink(driver.id, driver.name)}
                    disabled={unlinking === driver.id}
                    className="sp-btn-danger py-1.5 px-3 text-[0.8rem]"
                  >
                    {unlinking === driver.id ? <span className="sp-spinner" /> : <><UserMinus size={13} /> ยกเลิก</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <PremiumModal {...modalConfig} onClose={() => setModalConfig(p => ({ ...p, isOpen: false }))} />
    </div>
  );
}
