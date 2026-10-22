'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, LogOut, MapPin, Clock, Shield, Zap, TrendingUp, Navigation, CloudRain, User, Wallet, Package } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function DriverDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const showNotice = (type: 'error' | 'success', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const handleLogout = async () => {
    const { handleLogout: clearAuth } = await import('@/lib/auth');
    await clearAuth();
    window.location.href = '/login';
  };

  const fetchData = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') { router.push('/login'); return; }
    try {
      const [ordersRes, statsRes, hotRes] = await Promise.all([
        fetch('/api/proxy/orders/driver/my-jobs'),
        fetch('/api/proxy/orders/stats/driver'),
        fetch('/api/proxy/weather/hotspots'),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (statsRes.ok)  setStats(await statsRes.json());
      if (hotRes.ok)    setHotspots(await hotRes.json());
    } catch (err) { console.warn(err); }
    finally { setIsLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAccept = async (orderId: number) => {
    setAccepting(orderId);
    try {
      const res = await fetch(`/api/proxy/orders/${orderId}/accept`, {
        method: 'PATCH'
      });
      if (res.ok) router.push(`/driver/orders/${orderId}`);
      else { const e = await res.json(); showNotice('error', e.message || 'ไม่สามารถรับงานได้'); fetchData(); }
    } catch { showNotice('error', 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่'); }
    finally { setAccepting(null); }
  };

  if (isLoading) return (
    <div className="sp-page flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-[var(--n-200)] border-t-[var(--brand-500)] rounded-full animate-spin mx-auto" />
        <p className="sp-caps text-[var(--n-500)] mt-4">Loading Fleet Portal</p>
      </div>
    </div>
  );

  return (
    <div className="sp-page">
      {/* ── Nav ── */}
      <nav className="sp-nav">
        <div className="flex items-center gap-3">
          <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps text-[var(--n-500)] border-l border-[var(--n-200)] pl-3">Fleet</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/driver/radar" className="sp-btn-primary px-3.5 py-1.5 text-xs uppercase flex items-center gap-1.5">
            <Navigation size={12} /> เรดาร์
          </Link>
          <Link href="/driver/history" className="flex items-center gap-1.5 text-[var(--n-600)] text-xs uppercase font-bold no-underline hover:text-[var(--n-900)]">
            ประวัติ
          </Link>
          <ThemeToggle />
          <Link href="/driver/wallet" className="flex text-[var(--n-600)] hover:text-[var(--n-900)]" aria-label="กระเป๋าเงิน">
            <Wallet size={16} />
          </Link>
          <Link href="/driver/profile" className="flex text-[var(--n-600)] hover:text-[var(--n-900)]" aria-label="โปรไฟล์">
            <User size={16} />
          </Link>
          <button onClick={handleLogout} aria-label="ออกจากระบบ" className="bg-transparent border-none cursor-pointer text-[var(--n-600)] flex hover:text-[var(--n-900)]">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Inline notification */}
      {notice && (
        <div
          role="alert"
          className={`sp-animate fixed top-20 right-6 z-[9999] min-w-[260px] max-w-[400px] p-4 font-bold border-l-4 ${
            notice.type === 'error'
              ? 'bg-[var(--error-bg)] text-[var(--error-text)] border-l-[var(--error-text)]'
              : 'bg-[var(--success-bg)] text-[var(--success-text)] border-l-[var(--success-text)]'
          }`}
        >
          {notice.msg}
        </div>
      )}

      <main className="max-w-[600px] mx-auto py-12 px-6">

        {/* ── Stats Hero ── */}
        <div className="sp-animate mb-16">
          <span className="sp-section-eyebrow text-[var(--brand-500)]">DASHBOARD</span>
          <h1 className="sp-font-display sp-text-hero mt-2 text-[var(--n-900)]">รายงานวันนี้</h1>
          
          <div className="sp-kpi-row mt-10 mb-8">
            <div className="flex flex-col">
              <span className="sp-stat-label text-[var(--success-text)]">งานสำเร็จ</span>
              <div className="sp-stat-number sp-font-display text-[var(--n-900)]">{stats?.completedTrips ?? '—'}</div>
            </div>
            <div className="flex flex-col">
              <span className="sp-stat-label text-[var(--brand-600)]">กำลังส่ง</span>
              <div className="sp-stat-number sp-font-display text-[var(--n-900)]">{stats?.activeOrders ?? '—'}</div>
            </div>
            <div className="flex flex-col">
              <span className="sp-stat-label text-[var(--brand-500)]">รายได้</span>
              <div className="sp-stat-number sp-font-display text-[var(--n-900)]">฿{(stats?.totalIncome ?? 0).toLocaleString()}</div>
            </div>
          </div>

          {stats?.weatherBonus > 0 && (
            <div className="p-4 bg-[var(--n-50)] border-l-4 border-l-[var(--brand-500)] flex items-center gap-3">
              <Zap size={18} className="text-[var(--brand-500)]" />
              <span className="text-[var(--n-900)] text-sm font-bold uppercase tracking-wider">
                Surge Bonus <strong className="text-[var(--brand-500)]">+฿{stats.weatherBonus.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ── Surge Hotspots ── */}
        {hotspots.length > 0 && (
          <div className="sp-animate-d1 mb-16">
            <div className="sp-section-divider mb-8" />
            <div className="flex items-center gap-2 mb-5">
              <span className="sp-caps text-[var(--brand-500)]">Surge Hotspots</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none]">
              {hotspots.map((spot, i) => (
                <div key={i} className="min-w-[180px] p-5 bg-[var(--n-50)] border-t-2 border-t-[var(--n-200)] shrink-0">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-extrabold text-[var(--n-900)] text-base">{spot.city}</span>
                    <CloudRain size={16} className="text-[var(--brand-600)]" />
                  </div>
                  <span className="sp-caps text-[var(--brand-500)]">+20% Surge Bonus</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Assigned Orders ── */}
        <div className="sp-animate-d2">
          <div className="sp-section-divider mb-8" />
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="sp-caps text-[var(--n-500)]">ACTIVE</p>
              <h2 className="sp-font-display text-2xl font-extrabold text-[var(--n-900)]">งานที่มอบหมาย</h2>
            </div>
            <span className="sp-mono text-[var(--n-500)]">[{orders.length}]</span>
          </div>

          {orders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="sp-caps text-[var(--n-500)]">ไม่มีงานในขณะนี้</p>
              <p className="text-[var(--n-500)] text-sm mt-2 font-semibold">
                เปิดเรดาร์เพื่อรับการแจ้งเตือนแบบเรียลไทม์
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {orders.map(order => (
                <div key={order.id} className="sp-card p-0 overflow-hidden border border-[var(--n-200)] shadow-sm rounded-xl">
                  {order.weatherWarning && <div className="h-1 bg-[var(--brand-500)]" />}
                  
                  {/* Header Section */}
                  <div className="py-5 px-6 bg-[var(--n-50)] border-b border-[var(--n-150)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--brand-100)] rounded-[10px] flex items-center justify-center text-[var(--brand-600)]">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="sp-mono text-xs font-extrabold text-[var(--brand-600)]">{order.trackingNumber}</p>
                        <p className="font-bold text-[var(--n-900)] mt-0.5 text-lg">{order.productName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="sp-font-display font-black text-2xl text-[var(--n-900)]">
                        ฿{(order.totalPrice || order.price)?.toLocaleString()}
                      </p>
                      {order.weatherWarning && <span className="sp-caps text-[var(--brand-600)] text-[10px]">Surge +20%</span>}
                    </div>
                  </div>

                  {/* Body Section */}
                  <div className="p-6">
                    <div className="flex gap-4 mb-5 flex-wrap">
                      {order.estimatedMinutes && (
                        <span className="sp-caps bg-[var(--n-100)] py-1 px-2.5 rounded-md text-[var(--n-700)] flex items-center gap-1.5 text-xs">
                          <Clock size={12} /> ETA {order.estimatedMinutes} นาที
                        </span>
                      )}
                      {order.hasInsurance && (
                        <span className="sp-caps bg-[oklch(95%_0.05_270)] py-1 px-2.5 rounded-md text-[oklch(60%_0.15_270)] flex items-center gap-1.5 text-xs">
                          <Shield size={12} /> มีประกันคุ้มครอง
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 mb-8 bg-[var(--n-100)] p-4 rounded-lg border border-[var(--n-150)]">
                      <MapPin size={18} className="text-[var(--brand-500)] mt-0.5 shrink-0" />
                      <p className="text-[var(--n-600)] text-sm leading-relaxed font-medium">
                        <strong className="text-[var(--n-900)] text-base">{order.receiverName}</strong><br/>
                        {order.address}
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/driver/orders/${order.id}`)}
                      className="sp-btn-touch sp-btn-touch-full sp-btn-primary rounded-lg font-extrabold text-base p-5"
                    >
                      ดูรายละเอียด / อัปเดตสถานะ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
