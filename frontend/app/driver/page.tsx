'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, LogOut, MapPin, Clock, Shield, Zap, TrendingUp, Navigation, CloudRain, User, Wallet, Package } from 'lucide-react';

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--n-800)', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--n-200)', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p className="sp-caps" style={{ color: 'var(--n-500)', marginTop: '1rem' }}>Loading Fleet Portal</p>
      </div>
    </div>
  );

  return (
    <div className="sp-page">
      {/* ── Nav ── */}
      <nav className="sp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps" style={{ color: 'var(--n-500)', borderLeft: '1px solid var(--n-200)', paddingLeft: '0.75rem' }}>Fleet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/driver/radar" className="sp-btn-primary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Navigation size={12} /> เรดาร์
          </Link>
          <Link href="/driver/history" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--n-600)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}>
            ประวัติ
          </Link>
          <Link href="/driver/wallet" style={{ display: 'flex', color: 'var(--n-600)' }} aria-label="กระเป๋าเงิน">
            <Wallet size={16} />
          </Link>
          <Link href="/driver/profile" style={{ display: 'flex', color: 'var(--n-600)' }} aria-label="โปรไฟล์">
            <User size={16} />
          </Link>
          <button onClick={handleLogout} aria-label="ออกจากระบบ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-600)', display: 'flex' }}>
            <LogOut size={16} />
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

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* ── Stats Hero ── */}
        <div className="sp-animate" style={{ marginBottom: '4rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>DASHBOARD</span>
          <h1 className="sp-font-display sp-text-hero" style={{ marginTop: '0.5rem', color: 'var(--n-900)' }}>รายงานวันนี้</h1>
          
          <div className="sp-kpi-row" style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="sp-stat-label" style={{ color: 'var(--success-text)' }}>งานสำเร็จ</span>
              <div className="sp-stat-number sp-font-display" style={{ color: 'var(--n-900)' }}>{stats?.completedTrips ?? '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="sp-stat-label" style={{ color: 'var(--brand-600)' }}>กำลังส่ง</span>
              <div className="sp-stat-number sp-font-display" style={{ color: 'var(--n-900)' }}>{stats?.activeOrders ?? '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="sp-stat-label" style={{ color: 'var(--brand-500)' }}>รายได้</span>
              <div className="sp-stat-number sp-font-display" style={{ color: 'var(--n-900)' }}>฿{(stats?.totalIncome ?? 0).toLocaleString()}</div>
            </div>
          </div>

          {stats?.weatherBonus > 0 && (
            <div style={{ padding: '1rem', background: 'var(--n-50)', borderLeft: '4px solid var(--brand-500)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Zap size={18} style={{ color: 'var(--brand-500)' }} />
              <span style={{ color: 'var(--n-900)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Surge Bonus <strong style={{ color: 'var(--brand-500)' }}>+฿{stats.weatherBonus.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ── Surge Hotspots ── */}
        {hotspots.length > 0 && (
          <div className="sp-animate-d1" style={{ marginBottom: '4rem' }}>
            <div className="sp-section-divider" style={{ marginBottom: '2rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span className="sp-caps" style={{ color: 'var(--brand-500)' }}>Surge Hotspots</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' }}>
              {hotspots.map((spot, i) => (
                <div key={i} style={{ minWidth: '180px', padding: '1.25rem', background: 'var(--n-50)', borderTop: '2px solid var(--n-200)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 800, color: 'var(--n-900)', fontSize: '1rem' }}>{spot.city}</span>
                    <CloudRain size={16} style={{ color: 'var(--brand-600)' }} />
                  </div>
                  <span className="sp-caps" style={{ color: 'var(--brand-500)' }}>+20% Surge Bonus</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Assigned Orders ── */}
        <div className="sp-animate-d2">
          <div className="sp-section-divider" style={{ marginBottom: '2rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ACTIVE</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)' }}>งานที่มอบหมาย</h2>
            </div>
            <span className="sp-mono" style={{ color: 'var(--n-500)' }}>[{orders.length}]</span>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '4rem 0', textAlign: 'center' }}>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ไม่มีงานในขณะนี้</p>
              <p style={{ color: 'var(--n-500)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 600 }}>
                เปิดเรดาร์เพื่อรับการแจ้งเตือนแบบเรียลไทม์
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {orders.map(order => (
                <div key={order.id} className="sp-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                  {order.weatherWarning && <div style={{ height: '4px', background: 'var(--brand-500)' }} />}
                  
                  {/* Header Section */}
                  <div style={{ padding: '1.25rem 1.5rem', background: 'var(--n-50)', borderBottom: '1px solid var(--n-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', background: 'var(--brand-100)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="sp-mono" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-600)' }}>{order.trackingNumber}</p>
                        <p style={{ fontWeight: 700, color: 'var(--n-900)', marginTop: '0.125rem', fontSize: '1.1rem' }}>{order.productName}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="sp-font-display" style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--n-900)' }}>
                        ฿{(order.totalPrice || order.price)?.toLocaleString()}
                      </p>
                      {order.weatherWarning && <span className="sp-caps" style={{ color: 'var(--brand-600)', fontSize: '0.65rem' }}>Surge +20%</span>}
                    </div>
                  </div>

                  {/* Body Section */}
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {order.estimatedMinutes && (
                        <span className="sp-caps" style={{ background: 'var(--n-100)', padding: '0.35rem 0.65rem', borderRadius: '6px', color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                          <Clock size={12} /> ETA {order.estimatedMinutes} นาที
                        </span>
                      )}
                      {order.hasInsurance && (
                        <span className="sp-caps" style={{ background: 'oklch(95% 0.05 270)', padding: '0.35rem 0.65rem', borderRadius: '6px', color: 'oklch(60% 0.15 270)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                          <Shield size={12} /> มีประกันคุ้มครอง
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--n-150)' }}>
                      <MapPin size={18} style={{ color: 'var(--brand-500)', marginTop: '0.1rem', flexShrink: 0 }} />
                      <p style={{ color: 'var(--n-600)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                        <strong style={{ color: 'var(--n-900)', fontSize: '1rem' }}>{order.receiverName}</strong><br/>
                        {order.address}
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/driver/orders/${order.id}`)}
                      className="sp-btn-touch sp-btn-touch-full sp-btn-primary"
                      style={{ borderRadius: '8px', fontWeight: 800, fontSize: '1rem', padding: '1.25rem' }}
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
