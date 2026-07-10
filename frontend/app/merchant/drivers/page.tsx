'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck, UserPlus, UserMinus, Search, CheckCircle, AlertCircle } from 'lucide-react';

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchContact, setSearchContact] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getToken = () => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; token=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  const fetchDrivers = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push('/merchant/login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/my-drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDrivers(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [API_URL, router]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleSearch = async () => {
    if (!searchContact.trim()) return;
    const token = getToken();
    if (!token) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/users/find-driver?contact=${encodeURIComponent(searchContact.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSearchResult(await res.json());
      } else {
        const err = await res.json();
        alert(err.message || 'ไม่พบคนขับจากข้อมูลที่ระบุ');
      }
    } catch { alert('Network Error'); }
    finally { setSearching(false); }
  };

  const handleLink = async () => {
    if (!searchResult) return;
    const token = getToken();
    if (!token) return;
    setLinking(true);
    try {
      const res = await fetch(`${API_URL}/users/drivers/${searchResult.id}/link`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`เพิ่มคนขับ "${searchResult.name}" เข้าร้านเรียบร้อย`);
        setSearchResult(null);
        setSearchContact('');
        fetchDrivers();
      } else {
        const err = await res.json();
        alert(err.message || 'เพิ่มคนขับไม่สำเร็จ');
      }
    } catch { alert('Network Error'); }
    finally { setLinking(false); }
  };

  const handleUnlink = async (driverId: number, driverName: string) => {
    if (!confirm(`ยืนยันการยกเลิกความสัมพันธ์กับ "${driverName}"?`)) return;
    const token = getToken();
    if (!token) return;
    setUnlinking(driverId);
    try {
      const res = await fetch(`${API_URL}/users/drivers/${driverId}/unlink`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDrivers();
      } else {
        const err = await res.json();
        alert(err.message || 'ยกเลิกไม่สำเร็จ');
      }
    } catch { alert('Network Error'); }
    finally { setUnlinking(null); }
  };

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> กลับ Dashboard
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ width: '80px' }} />
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>จัดการคนขับ</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.25rem' }}>เพิ่มและจัดการคนขับประจำร้านของคุณ</p>
        </div>

        {/* ── Add Driver Panel ── */}
        <div className="sp-card" style={{ marginBottom: '2rem' }}>
          <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={14} /> เพิ่มคนขับเข้าร้าน
          </h3>
          <p style={{ color: 'var(--n-500)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            ค้นหาด้วย <strong>email</strong> หรือ <strong>เบอร์โทร</strong> ของคนขับที่ลงทะเบียนในระบบแล้ว
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text" value={searchContact}
              onChange={e => setSearchContact(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="sp-input" style={{ flex: 1 }}
              placeholder="email หรือ 08XXXXXXXX ของคนขับ"
            />
            <button onClick={handleSearch} disabled={searching} className="sp-btn-primary" style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
              {searching ? <span className="sp-spinner" /> : <><Search size={15} /> ค้นหา</>}
            </button>
          </div>

          {searchResult && (
            <div style={{ padding: '1rem', border: '1px solid var(--n-150)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--n-50)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{searchResult.name || 'ไม่ระบุชื่อ'}</div>
                <div style={{ color: 'var(--n-500)', fontSize: '0.8rem' }}>{searchResult.phone} · {searchResult.vehiclePlate || 'ไม่ระบุทะเบียน'}</div>
                {!searchResult.isVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning-text)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    <AlertCircle size={13} /> คนขับยังไม่ยืนยันตัวตน
                  </div>
                )}
                {searchResult.merchantId && searchResult.merchantId !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning-text)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    <AlertCircle size={13} /> คนขับนี้สังกัดร้านอื่นอยู่แล้ว
                  </div>
                )}
              </div>
              <button
                onClick={handleLink} disabled={linking || !searchResult.isVerified}
                className="sp-btn-primary" style={{ padding: '0.5rem 1rem' }}
              >
                {linking ? <span className="sp-spinner" /> : <><UserPlus size={14} /> เพิ่มเข้าร้าน</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Driver List ── */}
        <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--n-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="sp-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={16} /> คนขับในร้าน
            </h2>
            <span className="sp-caps" style={{ color: 'var(--n-400)' }}>{drivers.length} คน</span>
          </div>

          {drivers.length === 0 ? (
            <div className="sp-empty-centered">
              <Truck size={28} className="sp-empty-icon" />
              <p className="sp-empty-title">ยังไม่มีคนขับ</p>
              <p className="sp-empty-body">ค้นหาและเพิ่มคนขับด้านบน</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {drivers.map(driver => (
                <div key={driver.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--n-100)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{driver.name || 'ไม่ระบุชื่อ'}</div>
                    <div style={{ color: 'var(--n-500)', fontSize: '0.8rem' }}>
                      📞 {driver.phone || '-'} · 🚗 {driver.vehiclePlate || '-'} ({driver.vehicleType || '-'})
                    </div>
                    <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {driver.isVerified && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--success-text)' }}>
                          <CheckCircle size={11} /> ยืนยันแล้ว
                        </span>
                      )}
                      {driver.isActive && (
                        <span className="sp-badge sp-badge-delivered" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Active</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlink(driver.id, driver.name)}
                    disabled={unlinking === driver.id}
                    className="sp-btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    {unlinking === driver.id ? <span className="sp-spinner" /> : <><UserMinus size={13} /> ยกเลิก</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
