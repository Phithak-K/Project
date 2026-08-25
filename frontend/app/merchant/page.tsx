'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Truck, CheckCircle, Clock, LogOut, ChevronRight, RefreshCcw, Shield, UserCheck, X, BookOpen, Users } from 'lucide-react';
import { handleLogout as clearSession } from '@/lib/auth';

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, shipping: 0, delivered: 0, todaySales: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assignModal, setAssignModal] = useState<{ orderId: number; trackingNumber: string } | null>(null);
  const [myDrivers, setMyDrivers] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const showNotice = (type: 'error' | 'success', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, ordersRes, driversRes] = await Promise.all([
        fetch('/api/proxy/orders/stats', { signal: AbortSignal.timeout(10000) }),
        fetch('/api/proxy/orders/my-orders', { signal: AbortSignal.timeout(10000) }),
        fetch('/api/proxy/users/my-drivers', { signal: AbortSignal.timeout(10000) }),
      ]);
      if ([statsRes, ordersRes, driversRes].some(res => res.status === 401)) {
        await clearSession();
        window.location.replace('/login');
        return;
      }
      if (statsRes.ok && ordersRes.ok) {
        const s = await statsRes.json();
        setStats({ pending: s.pendingOrders || 0, shipping: s.shippingOrders || 0, delivered: s.deliveredOrders || 0, todaySales: s.todaySales || 0 });
        
        const oData = await ordersRes.json();
        setOrders(oData.data || oData || []);
      }
      if (driversRes.ok) setMyDrivers(await driversRes.json());
    } catch (err) {
      console.warn(err);
      showNotice('error', 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
    }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await clearSession();
    window.location.replace('/login');
  };

  if (isLoading) return (
    <div className="sp-page-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--n-800)', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p className="sp-caps" style={{ color: 'var(--n-500)', marginTop: '1rem' }}>Loading Merchant Portal</p>
      </div>
    </div>
  );

  const handleAssign = async (driverId: number) => {
    if (!assignModal) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/proxy/orders/${assignModal.orderId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      if (res.ok) {
        setAssignModal(null);
        fetchData();
      } else {
        const err = await res.json();
        showNotice('error', err.message || 'มอบหมายไม่สำเร็จ');
      }
    } catch { showNotice('error', 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่'); }
    finally { setAssignLoading(false); }
  };

  return (
    <div className="sp-page-dark">
      {/* ── Nav ── */}
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo-dark">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
          <span className="sp-caps" style={{ color: 'var(--n-500)', borderLeft: '1px solid var(--n-800)', paddingLeft: '0.75rem' }}>
            Merchant
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button id="btn-refresh" onClick={fetchData} title="รีเฟรช" aria-label="รีเฟรชข้อมูล" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-400)', display: 'flex' }}>
            <RefreshCcw size={16} className={isRefreshing ? 'sp-spinner' : ''} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
          <Link href="/profile" style={{ padding: '0.4rem', color: 'var(--n-400)' }} aria-label="โปรไฟล์">
            <UserCheck size={18} />
          </Link>
          <button id="btn-logout" onClick={handleLogout} aria-label="ออกจากระบบ" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'transparent', border: '1px solid var(--n-700)', padding: '0.5rem 1rem', color: 'var(--n-300)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <LogOut size={14} /> <span style={{ display: 'none' }}>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* Inline notification */}
      {notice && (
        <div
          role="alert"
          style={{ position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 9999, minWidth: '260px', maxWidth: '400px', background: notice.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)', color: notice.type === 'error' ? 'var(--error-text)' : 'var(--success-text)', padding: '1rem', borderLeft: `4px solid ${notice.type === 'error' ? 'var(--error-text)' : 'var(--success-text)'}`, fontWeight: 700 }}
          className="sp-animate"
        >
          {notice.msg}
        </div>
      )}

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* ── Header ── */}
        <div className="sp-animate" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '3rem' }}>
          <div>
            <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>DASHBOARD</span>
            <h1 className="sp-font-display sp-text-hero" style={{ marginTop: '0.5rem', color: 'var(--n-50)' }}>ออเดอร์วันนี้</h1>
            <p style={{ color: 'var(--n-400)', fontSize: '1rem', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              ยอดขายสะสม <Link href="/stats" style={{ color: 'var(--brand-500)', fontWeight: 900, marginLeft: '0.5rem', fontSize: '1.2rem' }}>฿{stats.todaySales.toLocaleString()}</Link>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/merchant/history">
              <button style={{ background: 'transparent', border: '1px solid var(--n-700)', color: 'var(--n-300)', padding: '0.75rem 1.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', fontSize: '0.8rem' }}>
                ประวัติร้านค้า
              </button>
            </Link>
            <Link href="/catalog">
              <button style={{ background: 'transparent', border: '1px solid var(--n-700)', color: 'var(--n-300)', padding: '0.75rem 1.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={14} /> สินค้า
              </button>
            </Link>
            <Link href="/drivers">
              <button style={{ background: 'transparent', border: '1px solid var(--n-700)', color: 'var(--n-300)', padding: '0.75rem 1.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={14} /> คนขับ
              </button>
            </Link>
            <Link href="/create-order">
              <button id="btn-create-order" className="sp-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> สร้างออเดอร์
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="sp-kpi-row sp-animate-d1" style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sp-stat-label" style={{ color: 'var(--brand-500)' }}>รอดำเนินการ</span>
            <div className="sp-stat-number sp-font-display" style={{ color: 'var(--brand-500)' }}>{stats.pending}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sp-stat-label" style={{ color: 'oklch(65% 0.15 260)' }}>กำลังส่ง</span>
            <div className="sp-stat-number sp-font-display" style={{ color: 'oklch(65% 0.15 260)' }}>{stats.shipping}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sp-stat-label" style={{ color: 'var(--success-text)' }}>สำเร็จวันนี้</span>
            <div className="sp-stat-number sp-font-display" style={{ color: 'var(--success-text)' }}>{stats.delivered}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '2px solid var(--n-800)', paddingLeft: '2rem' }}>
            <span className="sp-stat-label" style={{ color: 'var(--n-500)' }}>ระบบปลอดภัย</span>
            <div style={{ color: 'var(--n-300)', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} style={{ color: 'var(--brand-500)' }} /> ประกันทุกออเดอร์
            </div>
          </div>
        </div>

        {/* ── Orders Table ── */}
        <div className="sp-animate-d2">
          <div className="sp-section-divider" style={{ marginBottom: '2rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>RECENT</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-50)' }}>รายการล่าสุด</h2>
            </div>
            <span className="sp-mono" style={{ color: 'var(--n-400)' }}>[{orders.length}]</span>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '4rem 0', textAlign: 'center' }}>
              <Package size={32} style={{ color: 'var(--n-600)', margin: '0 auto 1rem' }} />
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ยังไม่มีออเดอร์</p>
            </div>
          ) : (
            <div className="sp-table-industrial">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    {['Tracking', 'สินค้า', 'ผู้รับ', 'ราคา', 'สถานะ', ''].map(h => (
                      <th key={h} className="sp-caps" style={{ padding: '1rem', color: 'var(--n-400)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id}>
                      <td className="sp-mono" style={{ fontWeight: 700, color: 'var(--brand-500)' }}>
                        {order.trackingNumber}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--n-50)' }}>
                        {order.productName}
                        {order.hasInsurance && <Shield size={14} style={{ display: 'inline', marginLeft: '0.5rem', color: 'var(--brand-500)', verticalAlign: 'middle' }} />}
                      </td>
                      <td style={{ color: 'var(--n-300)' }}>{order.receiverName}</td>
                      <td className="sp-mono" style={{ fontWeight: 700, color: 'var(--n-50)' }}>฿{(order.totalPrice || order.price)?.toLocaleString()}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {order.status === 'PENDING' && !order.driverId && (
                          <button
                            onClick={() => setAssignModal({ orderId: order.id, trackingNumber: order.trackingNumber })}
                            style={{ background: 'transparent', border: '1px solid var(--n-700)', color: 'var(--n-300)', padding: '0.375rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                          >
                            <UserCheck size={12} /> มอบหมาย
                          </button>
                        )}
                        <Link href={`/merchant/orders/${order.id}`}>
                          <ChevronRight size={18} style={{ color: 'var(--n-500)' }} />
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

      {/* ── Assign Driver Modal ── */}
      {assignModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)'
        }}>
          <div className="sp-animate-d1" style={{ width: '100%', maxWidth: '480px', background: 'var(--n-900)', borderTop: '4px solid var(--brand-500)', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 className="sp-font-display" style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--n-50)', textTransform: 'uppercase' }}>มอบหมายคนขับ</h2>
                <p className="sp-mono" style={{ color: 'var(--brand-500)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 700 }}>
                  ORDER: {assignModal.trackingNumber}
                </p>
              </div>
              <button onClick={() => setAssignModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)' }}>
                <X size={24} />
              </button>
            </div>

            {myDrivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Truck size={32} style={{ color: 'var(--n-600)', margin: '0 auto 1rem' }} />
                <p className="sp-caps" style={{ color: 'var(--n-400)' }}>ไม่มีคนขับในระบบ</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myDrivers.map(driver => (
                  <div key={driver.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem', background: 'var(--n-850)', border: '1px solid var(--n-800)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--n-50)' }}>{driver.name}</div>
                      <div className="sp-mono" style={{ color: 'var(--n-400)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {driver.vehiclePlate || '-'} · {driver.vehicleType || '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(driver.id)}
                      disabled={assignLoading}
                      className="sp-btn-primary"
                      style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem' }}
                    >
                      {assignLoading ? <span className="sp-spinner" style={{ borderTopColor: 'var(--n-900)' }} /> : 'มอบหมาย'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, any> = {
    PENDING: { bg: 'var(--brand-900)', color: 'var(--brand-500)' },
    ACCEPTED: { bg: 'oklch(20% 0.05 260)', color: 'oklch(65% 0.15 260)' },
    PICKED_UP: { bg: 'oklch(20% 0.05 260)', color: 'oklch(65% 0.15 260)' },
    SHIPPING: { bg: 'oklch(20% 0.05 260)', color: 'oklch(65% 0.15 260)' },
    DELIVERED: { bg: 'oklch(20% 0.06 150)', color: 'oklch(65% 0.15 150)' },
    CANCELLED: { bg: 'var(--error-bg)', color: 'var(--error-text)' },
  };
  const labels: Record<string, string> = {
    PENDING: 'รอยืนยัน', ACCEPTED: 'รับงานแล้ว', PICKED_UP: 'รับพัสดุแล้ว',
    SHIPPING: 'กำลังส่ง', DELIVERED: 'สำเร็จ', CANCELLED: 'ยกเลิก',
  };
  
  const style = map[status] || map.PENDING;
  
  return (
    <span style={{
      display: 'inline-flex', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
      background: style.bg, color: style.color
    }}>
      {labels[status] || status}
    </span>
  );
}
