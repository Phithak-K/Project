'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Truck, CheckCircle, Clock, LogOut, ChevronRight, RefreshCcw, Shield } from 'lucide-react';

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, shipping: 0, delivered: 0, todaySales: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchData = useCallback(async () => {
    const token = getCookie('token');
    if (!token) { window.location.href = '/login'; return; }
    setIsRefreshing(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/orders/stats`, { headers }),
        fetch(`${API_URL}/orders/my-orders`, { headers })
      ]);
      if (statsRes.ok && ordersRes.ok) {
        const s = await statsRes.json();
        setStats({ pending: s.pendingOrders || s.pendingCount || 0, shipping: s.shippingOrders || s.shippingCount || 0, delivered: s.deliveredOrders || s.completedToday || 0, todaySales: s.todaySales || 0 });
        setOrders(await ordersRes.json());
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, [API_URL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    window.location.href = '/login';
  };

  if (isLoading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
      <p className="sp-caps" style={{ color: 'var(--n-400)' }}>กำลังโหลด</p>
    </div>
  );

  return (
    <div className="sp-page">
      {/* ── Nav ── */}
      <nav className="sp-nav">
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span>
          <span className="sp-caps" style={{ color: 'var(--n-400)', marginLeft: '0.5rem' }}>Merchant</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button id="btn-refresh" onClick={fetchData} title="รีเฟรช" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-400)', display: 'flex' }}>
            <RefreshCcw size={17} className={isRefreshing ? 'sp-spinner' : ''} />
          </button>
          <button id="btn-logout" onClick={handleLogout} className="sp-btn-danger">
            <LogOut size={16} /> <span style={{ display: 'none' }}>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* ── Header ── */}
        <div className="sp-animate" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <span className="sp-section-eyebrow">แผงควบคุม</span>
            <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900, color: 'var(--n-900)' }}>ออเดอร์วันนี้</h1>
            <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              ยอดขายสะสม <Link href="/stats" className="sp-link-brand" style={{ fontWeight: 700 }}>฿{stats.todaySales.toLocaleString()}</Link>
            </p>
          </div>
          <Link href="/create-order">
            <button id="btn-create-order" className="sp-btn-primary">
              <Plus size={16} /> สร้างออเดอร์ใหม่
            </button>
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="sp-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div className="sp-card" style={{ borderLeft: '3px solid var(--warning-text)' }}>
            <div className="sp-stat-label">รอดำเนินการ</div>
            <div className="sp-stat-number" style={{ fontSize: '2.75rem' }}>{stats.pending}</div>
            <Clock size={16} style={{ color: 'var(--warning-text)', marginTop: '0.5rem' }} />
          </div>
          <div className="sp-card" style={{ borderLeft: '3px solid var(--info-text)' }}>
            <div className="sp-stat-label">กำลังส่ง</div>
            <div className="sp-stat-number" style={{ fontSize: '2.75rem' }}>{stats.shipping}</div>
            <Truck size={16} style={{ color: 'var(--info-text)', marginTop: '0.5rem' }} />
          </div>
          <div className="sp-card" style={{ borderLeft: '3px solid var(--success-text)' }}>
            <div className="sp-stat-label">สำเร็จวันนี้</div>
            <div className="sp-stat-number" style={{ fontSize: '2.75rem' }}>{stats.delivered}</div>
            <CheckCircle size={16} style={{ color: 'var(--success-text)', marginTop: '0.5rem' }} />
          </div>
          <div className="sp-card-dark" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Shield size={18} style={{ color: 'var(--brand-400)' }} />
            <div style={{ marginTop: '1rem' }}>
              <div className="sp-stat-label" style={{ color: 'var(--n-600)' }}>ระบบปลอดภัย</div>
              <div style={{ color: 'var(--n-200)', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.25rem' }}>ประกันทุกออเดอร์</div>
            </div>
          </div>
        </div>

        {/* ── Orders Table ── */}
        <div className="sp-card sp-animate-d2" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--n-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="sp-section-title">รายการล่าสุด</h2>
            <span className="sp-caps" style={{ color: 'var(--n-400)' }}>{orders.length} รายการ</span>
          </div>

          {orders.length === 0 ? (
            <div className="sp-empty-centered">
              <Package size={28} className="sp-empty-icon" />
              <p className="sp-empty-title">ยังไม่มีออเดอร์</p>
              <p className="sp-empty-body">สร้างออเดอร์แรกเพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sp-table">
                <thead className="sp-thead">
                  <tr>
                    {['Tracking', 'สินค้า', 'ผู้รับ', 'ราคา', 'สถานะ', ''].map(h => (
                      <th key={h} className="sp-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="sp-tr">
                      <td className="sp-td" style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-600)', fontSize: '0.8rem' }}>
                        {order.trackingNumber}
                      </td>
                      <td className="sp-td" style={{ fontWeight: 600, color: 'var(--n-800)' }}>
                        {order.productName}
                        {order.hasInsurance && <Shield size={11} style={{ display: 'inline', marginLeft: '0.375rem', color: 'var(--brand-400)', verticalAlign: 'middle' }} />}
                      </td>
                      <td className="sp-td">{order.receiverName}</td>
                      <td className="sp-td" style={{ fontWeight: 600 }}>฿{(order.totalPrice || order.price)?.toLocaleString()}</td>
                      <td className="sp-td"><StatusBadge status={order.status} /></td>
                      <td className="sp-td" style={{ textAlign: 'right' }}>
                        <Link href={`/orders/${order.id}`}>
                          <ChevronRight size={16} style={{ color: 'var(--n-300)' }} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'sp-badge sp-badge-pending',
    ACCEPTED: 'sp-badge sp-badge-accepted',
    PICKED_UP: 'sp-badge sp-badge-picked',
    SHIPPING: 'sp-badge sp-badge-shipping',
    DELIVERED: 'sp-badge sp-badge-delivered',
    CANCELLED: 'sp-badge sp-badge-cancelled',
  };
  const labels: Record<string, string> = {
    PENDING: 'รอยืนยัน', ACCEPTED: 'รับงานแล้ว', PICKED_UP: 'รับพัสดุแล้ว',
    SHIPPING: 'กำลังส่ง', DELIVERED: 'สำเร็จ', CANCELLED: 'ยกเลิก',
  };
  return <span className={map[status] || 'sp-badge sp-badge-pending'}>{labels[status] || status}</span>;
}