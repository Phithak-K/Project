'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Search, Clock, LogOut, ChevronRight } from 'lucide-react';

export default function CustomerDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [trackingInput, setTrackingInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchOrders = useCallback(async () => {
    const token = getCookie('token');
    if (!token) { router.push('/login'); return; }
    try {
      const res = await fetch(`${API_URL}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [API_URL, router]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    window.location.href = '/login';
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) router.push(`/track/${trackingInput.trim()}`);
  };

  if (isLoading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      {/* ── Nav ── */}
      <nav className="sp-nav">
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span>
          <span className="sp-caps" style={{ color: 'var(--n-400)', marginLeft: '0.5rem' }}>App</span>
        </span>
        <button id="btn-logout" onClick={handleLogout} className="sp-btn-danger">
          <LogOut size={16} />
        </button>
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* ── Tracking Search Box ── */}
        <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">ติดตามพัสดุ</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900, marginBottom: '1rem' }}>
            พัสดุของคุณอยู่ที่ไหน?
          </h1>
          <form id="form-track" onSubmit={handleTrack} style={{ display: 'flex', gap: '0.625rem' }}>
            <input
              id="tracking-input"
              type="text"
              value={trackingInput}
              onChange={e => setTrackingInput(e.target.value)}
              className="sp-input"
              style={{ flex: 1 }}
              placeholder="กรอกหมายเลขพัสดุ เช่น SP-XXXX"
            />
            <button id="btn-track" type="submit" className="sp-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Search size={16} /> ค้นหา
            </button>
          </form>
        </div>

        {/* ── Order History ── */}
        <div className="sp-section-header">
          <h2 className="sp-section-title">พัสดุของฉัน</h2>
          <span className="sp-caps" style={{ color: 'var(--n-400)' }}>{orders.length} รายการ</span>
        </div>

        {orders.length === 0 ? (
          <div className="sp-card">
            <div className="sp-empty-centered">
              <Clock size={28} className="sp-empty-icon" />
              <p className="sp-empty-title">ยังไม่มีรายการพัสดุ</p>
              <p className="sp-empty-body">พัสดุที่จัดส่งถึงคุณจะแสดงที่นี่</p>
            </div>
          </div>
        ) : (
          <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                <div className="sp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color var(--t-fast)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Package size={20} style={{ color: 'var(--n-400)', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--n-900)', fontSize: '0.95rem' }}>{order.trackingNumber}</p>
                      <p className="sp-caps" style={{ color: 'var(--n-400)', marginTop: '0.125rem' }}>{order.productName}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <StatusBadge status={order.status} />
                    <ChevronRight size={16} style={{ color: 'var(--n-300)' }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Footer CTA ── */}
        <div className="sp-divider" style={{ marginTop: '3rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p className="sp-caps" style={{ color: 'var(--n-400)' }}>ต้องการใช้งานในฐานะอื่น?</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/merchant/register">
              <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>เปิดร้านค้า</button>
            </Link>
            <Link href="/driver/register">
              <button className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}>สมัครเป็นคนขับ</button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'sp-badge sp-badge-pending', ACCEPTED: 'sp-badge sp-badge-accepted',
    PICKED_UP: 'sp-badge sp-badge-picked', SHIPPING: 'sp-badge sp-badge-shipping',
    DELIVERED: 'sp-badge sp-badge-delivered', CANCELLED: 'sp-badge sp-badge-cancelled',
  };
  const labels: Record<string, string> = {
    PENDING: 'รอยืนยัน', ACCEPTED: 'รับงานแล้ว', PICKED_UP: 'รับพัสดุแล้ว',
    SHIPPING: 'กำลังส่ง', DELIVERED: 'สำเร็จ', CANCELLED: 'ยกเลิก',
  };
  return <span className={map[status] || 'sp-badge sp-badge-pending'}>{labels[status] || status}</span>;
}