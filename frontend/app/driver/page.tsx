'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, LogOut, MapPin, Clock, Shield, Zap, TrendingUp, Navigation, CloudRain } from 'lucide-react';

export default function DriverDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const handleLogout = () => {
    const past = 'Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = `token=; path=/; expires=${past}`;
    document.cookie = `role=; path=/; expires=${past}`;
    document.cookie = `token=; path=/; domain=localhost; expires=${past}`;
    document.cookie = `role=; path=/; domain=localhost; expires=${past}`;
    window.location.href = '/login';
  };

  const fetchData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { router.push('/driver/login'); return; }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, statsRes, hotRes] = await Promise.all([
        fetch(`${API_URL}/orders/available`, { headers }),
        fetch(`${API_URL}/orders/driver-stats`, { headers }),
        fetch(`${API_URL}/weather/hotspots`, { headers }),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (statsRes.ok)  setStats(await statsRes.json());
      if (hotRes.ok)    setHotspots(await hotRes.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [API_URL, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAccept = async (orderId: number) => {
    const token = getAuthToken();
    setAccepting(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) router.push(`/driver/orders/${orderId}`);
      else { const e = await res.json(); alert(e.message || 'ไม่สามารถรับงานได้'); fetchData(); }
    } catch { alert('Network Error'); }
    finally { setAccepting(null); }
  };

  if (isLoading) return (
    <div className="sp-page-loading" style={{ background: 'var(--n-900)' }}>
      <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
    </div>
  );

  return (
    <div className="sp-page-dark">
      {/* ── Nav ── */}
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>Fleet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/driver/radar">
            <button className="sp-btn-brand" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              <Navigation size={14} /> ดูเรดาร์
            </button>
          </Link>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-600)', display: 'flex', opacity: 0.6 }}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── Stats Hero ── */}
        <div className="sp-card-dark sp-animate" style={{ marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          <p className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1.25rem' }}>รายงานวันนี้</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div>
              <div className="sp-stat-number" style={{ fontSize: '2.5rem', color: 'var(--n-50)' }}>{stats?.completedTrips ?? '—'}</div>
              <div className="sp-stat-label" style={{ color: 'var(--n-600)' }}>งานสำเร็จ</div>
            </div>
            <div>
              <div className="sp-stat-number" style={{ fontSize: '2.5rem', color: 'var(--n-50)' }}>{stats?.activeOrders ?? '—'}</div>
              <div className="sp-stat-label" style={{ color: 'var(--n-600)' }}>กำลังส่ง</div>
            </div>
            <div>
              <div className="sp-stat-number" style={{ fontSize: '1.6rem', color: 'var(--n-50)' }}>฿{(stats?.totalIncome ?? 0).toLocaleString()}</div>
              <div className="sp-stat-label" style={{ color: 'var(--n-600)' }}>รายได้</div>
            </div>
          </div>
          {stats?.weatherBonus > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--n-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={14} style={{ color: 'var(--brand-400)' }} />
              <span style={{ color: 'var(--brand-400)', fontSize: '0.875rem', fontWeight: 600 }}>
                Surge Bonus +฿{stats.weatherBonus.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* ── Surge Hotspots ── */}
        {hotspots.length > 0 && (
          <div className="sp-animate-d1" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <TrendingUp size={14} style={{ color: 'var(--brand-400)' }} />
              <span className="sp-caps" style={{ color: 'var(--n-600)' }}>Surge Hotspots</span>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {hotspots.map((spot, i) => (
                <div key={i} className="sp-card-dark" style={{ minWidth: '160px', padding: '0.875rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--n-200)', fontSize: '0.9rem' }}>{spot.city}</span>
                    <CloudRain size={14} style={{ color: 'oklch(65% 0.12 220)' }} />
                  </div>
                  <span className="sp-caps" style={{ color: 'var(--brand-400)' }}>+20% Surge</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Available Orders ── */}
        <div className="sp-section-header" style={{ marginBottom: '1rem' }}>
          <h2 className="sp-section-title" style={{ color: 'var(--n-100)' }}>งานใหม่</h2>
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>{orders.length} งาน</span>
        </div>

        {orders.length === 0 ? (
          <div className="sp-card-dark" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <p className="sp-caps" style={{ color: 'var(--n-600)' }}>ไม่มีงานในขณะนี้</p>
            <p style={{ color: 'var(--n-700)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
              เปิดเรดาร์เพื่อรับการแจ้งเตือนแบบเรียลไทม์
            </p>
          </div>
        ) : (
          <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {orders.map(order => (
              <div key={order.id} className="sp-card-dark" style={{ padding: 0, overflow: 'hidden' }}>
                {order.weatherWarning && <div style={{ height: '3px', background: 'var(--brand-500)' }} />}
                <div style={{ padding: '1.125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-400)' }}>{order.trackingNumber}</p>
                      <p style={{ fontWeight: 600, color: 'var(--n-100)', marginTop: '0.125rem' }}>{order.productName}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="sp-font-display" style={{ fontWeight: 900, fontSize: '1.35rem', color: 'var(--n-50)' }}>
                        ฿{(order.totalPrice || order.price)?.toLocaleString()}
                      </p>
                      {order.weatherWarning && <span className="sp-caps" style={{ color: 'var(--brand-400)' }}>Surge +20%</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {order.estimatedMinutes && (
                      <span className="sp-caps" style={{ color: 'var(--n-600)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} /> ETA {order.estimatedMinutes} นาที
                      </span>
                    )}
                    {order.hasInsurance && (
                      <span className="sp-caps" style={{ color: 'oklch(65% 0.12 270)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Shield size={11} /> ประกัน
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <MapPin size={13} style={{ color: 'var(--n-700)', marginTop: '0.1rem', flexShrink: 0 }} />
                    <p style={{ color: 'var(--n-500)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {order.receiverName} — {order.address}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={accepting === order.id}
                    className="sp-btn-brand sp-btn-full"
                    style={{ padding: '0.75rem' }}
                  >
                    {accepting === order.id
                      ? <span className="sp-spinner" />
                      : <><CheckCircle size={15} /> รับงานนี้</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
