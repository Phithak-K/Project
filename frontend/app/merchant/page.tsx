'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, LogOut, Package, RefreshCcw, 
  ChevronRight, Shield, UserCheck, BookOpen, Users,
  Truck, X 
} from 'lucide-react';

export default function MerchantDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, shipping: 0, delivered: 0, todaySales: 0 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [myDrivers, setMyDrivers] = useState<any[]>([]);
  
  const [assignModal, setAssignModal] = useState<{ orderId: number, trackingNumber: string } | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    
    try {
      const res = await fetch('/api/proxy/orders/my-orders');
      if (res.ok) {
        const resData = await res.json();
        const ordersList = resData.data || [];
        setOrders(ordersList);
        
        let pending = 0, shipping = 0, delivered = 0, todaySales = 0;
        const today = new Date().toDateString();
        
        ordersList.forEach((o: any) => {
          if (o.status === 'PENDING') pending++;
          if (['ACCEPTED', 'PICKED_UP', 'SHIPPING'].includes(o.status)) shipping++;
          if (o.status === 'DELIVERED') {
            delivered++;
            if (new Date(o.updatedAt).toDateString() === today) {
              todaySales += Number(o.totalPrice || o.price || 0);
            }
          }
        });
        
        setStats({ pending, shipping, delivered, todaySales });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/users/my-drivers');
      if (res.ok) {
        const data = await res.json();
        setMyDrivers(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    const role = getCookie('role');
    if (!role || role !== 'Merchant') {
      router.push('/login');
      return;
    }
    
    fetchData();
    fetchDrivers();
  }, [router, fetchData, fetchDrivers]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const handleAssign = async (driverId: number) => {
    if (!assignModal) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/proxy/orders/${assignModal.orderId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });
      if (res.ok) {
        setNotice({ msg: 'มอบหมายงานสำเร็จ', type: 'success' });
        setAssignModal(null);
        fetchData(true);
      } else {
        setNotice({ msg: 'ไม่สามารถมอบหมายงานได้', type: 'error' });
      }
    } catch (err) {
      setNotice({ msg: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
    } finally {
      setAssignLoading(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  if (loading) return <div className="sp-page-loading" style={{ background: 'var(--n-50)' }}><span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} /></div>;

  return (
    <div className="sp-page" style={{ minHeight: '100vh', background: 'var(--n-50)', paddingBottom: '4rem' }}>
      {/* ── Nav ── */}
      <nav className="sp-nav" style={{ background: '#fff', borderBottom: '1px solid var(--n-200)', position: 'sticky', top: 0, zIndex: 10 }}>
        <span className="sp-logo">Store<span className="sp-logo-accent">Portal</span></span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button id="btn-refresh" onClick={() => fetchData(true)} title="รีเฟรช" aria-label="รีเฟรชข้อมูล" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)', display: 'flex' }}>
            <RefreshCcw size={16} className={isRefreshing ? 'sp-spinner' : ''} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
          <Link href="/merchant/profile" style={{ padding: '0.4rem', color: 'var(--n-500)' }} aria-label="โปรไฟล์">
            <UserCheck size={18} />
          </Link>
          <button id="btn-logout" onClick={handleLogout} aria-label="ออกจากระบบ" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'transparent', border: '1px solid var(--n-300)', padding: '0.5rem 1rem', color: 'var(--n-600)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: '8px' }}>
            <LogOut size={14} /> <span style={{ display: 'none' }}>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* Inline notification */}
      {notice && (
        <div
          role="alert"
          style={{ position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 9999, minWidth: '260px', maxWidth: '400px', background: notice.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)', color: notice.type === 'error' ? 'var(--error-text)' : 'var(--success-text)', padding: '1rem', borderRadius: '12px', borderLeft: `4px solid ${notice.type === 'error' ? 'var(--error-text)' : 'var(--success-text)'}`, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          className="sp-animate"
        >
          {notice.msg}
        </div>
      )}

      <main style={{ maxWidth: '1100px', margin: '0 auto' }} className="sp-main-fluid">

        {/* ── Header ── */}
        <div className="sp-animate" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '3rem' }}>
          <div>
            <span className="sp-section-eyebrow" style={{ color: 'var(--brand-600)' }}>DASHBOARD</span>
            <h1 className="sp-font-display sp-text-hero" style={{ marginTop: '0.5rem', color: 'var(--n-900)' }}>ออเดอร์วันนี้</h1>
            <p style={{ color: 'var(--n-600)', fontSize: '1rem', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              ยอดขายสะสม <Link href="/merchant/stats" style={{ color: 'var(--brand-600)', fontWeight: 900, marginLeft: '0.5rem', fontSize: '1.2rem', textDecoration: 'none' }}>฿{stats.todaySales.toLocaleString()}</Link>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/merchant/history">
              <button className="sp-btn-ghost sp-merchant-nav-btn sp-btn-touch-safe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} />
                <span className="sp-nav-label">ประวัติร้านค้า</span>
              </button>
            </Link>
            <Link href="/merchant/catalog">
              <button className="sp-btn-ghost sp-merchant-nav-btn sp-btn-touch-safe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={14} />
                <span className="sp-nav-label">สินค้า</span>
              </button>
            </Link>
            <Link href="/merchant/drivers">
              <button className="sp-btn-ghost sp-merchant-nav-btn sp-btn-touch-safe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={14} />
                <span className="sp-nav-label">คนขับ</span>
              </button>
            </Link>
            <Link href="/merchant/create-order">
              <button id="btn-create-order" className="sp-btn-primary sp-btn-touch-safe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', padding: '0.75rem 1.25rem' }}>
                <Plus size={16} />
                <span className="sp-nav-label">สร้างออเดอร์</span>
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="sp-kpi-row sp-animate-d1" style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sp-stat-label" style={{ color: 'var(--brand-600)' }}>รอดำเนินการ</span>
            <div className="sp-stat-number sp-font-display" style={{ color: 'var(--brand-600)' }}>{stats.pending}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sp-stat-label" style={{ color: 'oklch(60% 0.15 260)' }}>กำลังส่ง</span>
            <div className="sp-stat-number sp-font-display" style={{ color: 'oklch(60% 0.15 260)' }}>{stats.shipping}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sp-stat-label" style={{ color: 'var(--success-text)' }}>สำเร็จวันนี้</span>
            <div className="sp-stat-number sp-font-display" style={{ color: 'var(--success-text)' }}>{stats.delivered}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '2px solid var(--n-200)', paddingLeft: '2rem' }}>
            <span className="sp-stat-label" style={{ color: 'var(--n-500)' }}>ระบบปลอดภัย</span>
            <div style={{ color: 'var(--n-700)', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} style={{ color: 'var(--brand-500)' }} /> ประกันทุกออเดอร์
            </div>
          </div>
        </div>

        {/* ── Orders Table ── */}
        <div className="sp-animate-d2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>RECENT</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)' }}>รายการล่าสุด</h2>
            </div>
            <span className="sp-mono" style={{ color: 'var(--n-500)' }}>[{orders.length}]</span>
          </div>

          {orders.length === 0 ? (
            <div className="sp-card" style={{ padding: '4rem 0', textAlign: 'center', background: '#fff' }}>
              <Package size={32} style={{ color: 'var(--n-400)', margin: '0 auto 1rem' }} />
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ยังไม่มีออเดอร์</p>
            </div>
          ) : (
            <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="sp-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--n-200)' }}>
                  <tr>
                    {['Tracking', 'สินค้า', 'ผู้รับ', 'ราคา', 'สถานะ', ''].map(h => (
                      <th key={h} className="sp-caps" style={{ padding: '1rem', color: 'var(--n-500)', fontSize: '0.75rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--n-150)' }}>
                      <td className="sp-mono" style={{ padding: '1rem', fontWeight: 800, color: 'var(--brand-600)', fontSize: '0.85rem' }}>
                        {order.trackingNumber}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--n-900)', fontSize: '0.95rem' }}>
                        {order.productName}
                        {order.hasInsurance && <Shield size={14} style={{ display: 'inline', marginLeft: '0.5rem', color: 'var(--brand-500)', verticalAlign: 'middle' }} />}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--n-600)', fontSize: '0.9rem', fontWeight: 500 }}>{order.receiverName}</td>
                      <td className="sp-mono" style={{ padding: '1rem', fontWeight: 800, color: 'var(--n-900)' }}>฿{(order.totalPrice || order.price)?.toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}><StatusBadge status={order.status} /></td>
                      <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {order.status === 'PENDING' && !order.driverId && (
                          <button
                            onClick={() => setAssignModal({ orderId: order.id, trackingNumber: order.trackingNumber })}
                            style={{ background: 'var(--n-50)', border: '1px solid var(--n-300)', color: 'var(--n-700)', padding: '0.4rem 0.8rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '6px' }}
                          >
                            <UserCheck size={14} /> มอบหมาย
                          </button>
                        )}
                        <Link href={`/merchant/orders/${order.id}`}>
                          <ChevronRight size={18} style={{ color: 'var(--n-400)' }} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Assign Driver Modal ── */}
      {assignModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
          <div className="sp-animate-d1 sp-card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'var(--brand-500)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 className="sp-font-display" style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--n-900)', textTransform: 'uppercase' }}>มอบหมายคนขับ</h2>
                <p className="sp-mono" style={{ color: 'var(--brand-600)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 800 }}>
                  ORDER: {assignModal.trackingNumber}
                </p>
              </div>
              <button onClick={() => setAssignModal(null)} style={{ background: 'var(--n-50)', border: 'none', cursor: 'pointer', color: 'var(--n-500)', padding: '0.5rem', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {myDrivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', background: 'var(--n-50)', borderRadius: '8px' }}>
                <Truck size={32} style={{ color: 'var(--n-400)', margin: '0 auto 1rem' }} />
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ไม่มีคนขับในระบบ</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myDrivers.map(driver => (
                  <div key={driver.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem', background: '#fff', border: '1px solid var(--n-200)', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--n-900)' }}>{driver.name}</div>
                      <div className="sp-mono" style={{ color: 'var(--n-500)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>
                        {driver.vehiclePlate || '-'} · {driver.vehicleType || '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(driver.id)}
                      disabled={assignLoading}
                      className="sp-btn-touch sp-btn-primary"
                      style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      {assignLoading ? <span className="sp-spinner" style={{ borderTopColor: 'var(--n-900)' }} /> : 'เลือกคนขับ'}
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
