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

  if (loading) return <div className="sp-page-loading bg-[var(--n-50)]"><span className="sp-spinner sp-spinner-lg border-t-[var(--brand-500)]" /></div>;

  return (
    <div className="sp-page min-h-screen bg-[var(--n-50)] pb-16">
      {/* ── Nav ── */}
      <nav className="sp-nav bg-white border-b border-[var(--n-200)] sticky top-0 z-10">
        <span className="sp-logo">Store<span className="sp-logo-accent">Portal</span></span>
        
        <div className="flex items-center gap-4">
          <button id="btn-refresh" onClick={() => fetchData(true)} title="รีเฟรช" aria-label="รีเฟรชข้อมูล" className="bg-transparent border-none cursor-pointer text-[var(--n-500)] flex">
            <RefreshCcw size={16} className={isRefreshing ? 'sp-spinner animate-spin' : ''} />
          </button>
          <Link href="/merchant/profile" className="p-1.5 text-[var(--n-500)]" aria-label="โปรไฟล์">
            <UserCheck size={18} />
          </Link>
          <button id="btn-logout" onClick={handleLogout} aria-label="ออกจากระบบ" className="flex items-center gap-1.5 bg-transparent border border-[var(--n-300)] py-2 px-4 text-[var(--n-600)] cursor-pointer text-xs font-bold uppercase rounded-lg">
            <LogOut size={14} /> <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* Inline notification */}
      {notice && (
        <div
          role="alert"
          className={`sp-animate fixed top-20 right-6 z-50 min-w-[260px] max-w-[400px] p-4 rounded-xl border-l-4 font-bold shadow-md ${notice.type === 'error' ? 'bg-[var(--error-bg)] text-[var(--error-text)] border-l-[var(--error-text)]' : 'bg-[var(--success-bg)] text-[var(--success-text)] border-l-[var(--success-text)]'}`}
        >
          {notice.msg}
        </div>
      )}

      <main className="max-w-[1100px] mx-auto sp-main-fluid">

        {/* ── Header ── */}
        <div className="sp-animate flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <span className="sp-section-eyebrow text-[var(--brand-600)]">DASHBOARD</span>
            <h1 className="sp-font-display sp-text-hero mt-2 text-[var(--n-900)]">ออเดอร์วันนี้</h1>
            <p className="text-[var(--n-600)] text-base mt-4 uppercase tracking-wider font-semibold">
              ยอดขายสะสม <Link href="/merchant/stats" className="text-[var(--brand-600)] font-black ml-2 text-xl no-underline">฿{stats.todaySales.toLocaleString()}</Link>
            </p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <Link href="/merchant/history">
              <button className="sp-btn-ghost sp-merchant-nav-btn sp-btn-touch-safe flex items-center gap-2">
                <Search size={14} />
                <span className="sp-nav-label">ประวัติร้านค้า</span>
              </button>
            </Link>
            <Link href="/merchant/catalog">
              <button className="sp-btn-ghost sp-merchant-nav-btn sp-btn-touch-safe flex items-center gap-2">
                <BookOpen size={14} />
                <span className="sp-nav-label">สินค้า</span>
              </button>
            </Link>
            <Link href="/merchant/drivers">
              <button className="sp-btn-ghost sp-merchant-nav-btn sp-btn-touch-safe flex items-center gap-2">
                <Users size={14} />
                <span className="sp-nav-label">คนขับ</span>
              </button>
            </Link>
            <Link href="/merchant/create-order">
              <button id="btn-create-order" className="sp-btn-primary sp-btn-touch-safe flex items-center gap-2 rounded-lg py-3 px-5">
                <Plus size={16} />
                <span className="sp-nav-label">สร้างออเดอร์</span>
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="sp-kpi-row sp-animate-d1 mb-16">
          <div className="flex flex-col">
            <span className="sp-stat-label text-[var(--brand-600)]">รอดำเนินการ</span>
            <div className="sp-stat-number sp-font-display text-[var(--brand-600)]">{stats.pending}</div>
          </div>
          <div className="flex flex-col">
            <span className="sp-stat-label text-[oklch(60%_0.15_260)]">กำลังส่ง</span>
            <div className="sp-stat-number sp-font-display text-[oklch(60%_0.15_260)]">{stats.shipping}</div>
          </div>
          <div className="flex flex-col">
            <span className="sp-stat-label text-[var(--success-text)]">สำเร็จวันนี้</span>
            <div className="sp-stat-number sp-font-display text-[var(--success-text)]">{stats.delivered}</div>
          </div>
          <div className="flex flex-col border-l-2 border-[var(--n-200)] pl-8">
            <span className="sp-stat-label text-[var(--n-500)]">ระบบปลอดภัย</span>
            <div className="text-[var(--n-700)] font-semibold text-sm mt-2 flex items-center gap-2">
              <Shield size={16} className="text-[var(--brand-500)]" /> ประกันทุกออเดอร์
            </div>
          </div>
        </div>

        {/* ── Orders Table ── */}
        <div className="sp-animate-d2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="sp-caps text-[var(--n-500)]">RECENT</p>
              <h2 className="sp-font-display text-2xl font-extrabold text-[var(--n-900)]">รายการล่าสุด</h2>
            </div>
            <span className="sp-mono text-[var(--n-500)]">[{orders.length}]</span>
          </div>

          {orders.length === 0 ? (
            <div className="sp-card py-16 text-center bg-white">
              <Package size={32} className="text-[var(--n-400)] mx-auto mb-4" />
              <p className="sp-caps text-[var(--n-500)]">ยังไม่มีออเดอร์</p>
            </div>
          ) : (
            <div className="sp-card p-0 overflow-hidden">
              <div className="sp-table-wrap">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[var(--n-50)] border-b border-[var(--n-200)]">
                  <tr>
                    {['Tracking', 'สินค้า', 'ผู้รับ', 'ราคา', 'สถานะ', ''].map(h => (
                      <th key={h} className="sp-caps p-4 text-[var(--n-500)] text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="border-b border-[var(--n-150)]">
                      <td className="sp-mono p-4 font-extrabold text-[var(--brand-600)] text-sm">
                        {order.trackingNumber}
                      </td>
                      <td className="p-4 font-bold text-[var(--n-900)] text-[0.95rem]">
                        {order.productName}
                        {order.hasInsurance && <Shield size={14} className="inline ml-2 text-[var(--brand-500)] align-middle" />}
                      </td>
                      <td className="p-4 text-[var(--n-600)] text-sm font-medium">{order.receiverName}</td>
                      <td className="sp-mono p-4 font-extrabold text-[var(--n-900)]">฿{(order.totalPrice || order.price)?.toLocaleString()}</td>
                      <td className="p-4"><StatusBadge status={order.status} /></td>
                      <td className="p-4 text-right flex gap-4 justify-end items-center">
                        {order.status === 'PENDING' && !order.driverId && (
                          <button
                            onClick={() => setAssignModal({ orderId: order.id, trackingNumber: order.trackingNumber })}
                            className="bg-[var(--n-50)] border border-[var(--n-300)] text-[var(--n-700)] py-1.5 px-3 text-[0.7rem] font-extrabold uppercase cursor-pointer flex items-center gap-1.5 rounded-md"
                          >
                            <UserCheck size={14} /> มอบหมาย
                          </button>
                        )}
                        <Link href={`/merchant/orders/${order.id}`}>
                          <ChevronRight size={18} className="text-[var(--n-400)]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="sp-animate-d1 sp-card w-full max-w-[480px] p-10 relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--brand-500)]" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="sp-font-display font-black text-2xl text-[var(--n-900)] uppercase">มอบหมายคนขับ</h2>
                <p className="sp-mono text-[var(--brand-600)] text-sm mt-2 font-extrabold">
                  ORDER: {assignModal.trackingNumber}
                </p>
              </div>
              <button onClick={() => setAssignModal(null)} className="bg-[var(--n-50)] border-none cursor-pointer text-[var(--n-500)] p-2 rounded-full">
                <X size={20} />
              </button>
            </div>

            {myDrivers.length === 0 ? (
              <div className="text-center py-12 bg-[var(--n-50)] rounded-lg">
                <Truck size={32} className="text-[var(--n-400)] mx-auto mb-4" />
                <p className="sp-caps text-[var(--n-500)]">ไม่มีคนขับในระบบ</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {myDrivers.map(driver => (
                  <div key={driver.id} className="flex justify-between items-center p-5 bg-white border border-[var(--n-200)] rounded-xl shadow-xs">
                    <div>
                      <div className="font-bold text-lg text-[var(--n-900)]">{driver.name}</div>
                      <div className="sp-mono text-[var(--n-500)] text-sm mt-1 font-semibold">
                        {driver.vehiclePlate || '-'} · {driver.vehicleType || '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(driver.id)}
                      disabled={assignLoading}
                      className="sp-btn-touch sp-btn-primary py-2.5 px-5 text-xs rounded-lg"
                    >
                      {assignLoading ? <span className="sp-spinner border-t-[var(--n-900)]" /> : 'เลือกคนขับ'}
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
