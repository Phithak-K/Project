'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { MapPin, Clock, Shield, Zap, TrendingUp, CheckCircle, CloudRain, LogOut } from 'lucide-react';

export default function DriverRadarPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const getToken = () => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; token=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push('/driver/login'); return; }
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [ordRes, hotRes] = await Promise.all([
        fetch(`${API_URL}/orders/available`, { headers: h }),
        fetch(`${API_URL}/weather/hotspots`,  { headers: h }),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (hotRes.ok) setHotspots(await hotRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [API_URL, router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 60_000);

    const sock = io(API_URL, { auth: { token: `Bearer ${token}` } });
    sock.on('new_available_order', (order: any) => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev]);
    });
    sock.on('order_taken', (data: { orderId: number }) => {
      setOrders(prev => prev.filter(o => o.id !== data.orderId));
    });
    setSocket(sock);
    return () => { sock.disconnect(); clearInterval(interval); };
  }, [API_URL, fetchOrders]);

  const handleAccept = async (orderId: number) => {
    const token = getToken();
    setAccepting(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) router.push(`/driver/orders/${orderId}`);
      else {
        const e = await res.json();
        alert(e.message || 'ไม่สามารถรับงานได้');
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch { alert('Network Error'); }
    finally { setAccepting(null); }
  };

  return (
    <div className="sp-page-dark">
      {/* ── Nav ── */}
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>Radar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="sp-caps" style={{ color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-text)', display: 'inline-block', animation: 'sp-in 1.2s ease-in-out infinite alternate' }} />
            Live
          </span>
          <button onClick={() => { document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'; window.location.href = '/login'; }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-600)', display: 'flex', opacity: 0.6 }}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── Hotspots ── */}
        {hotspots.length > 0 && (
          <div className="sp-animate" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <TrendingUp size={14} style={{ color: 'var(--brand-400)' }} />
              <span className="sp-caps" style={{ color: 'var(--n-600)' }}>Surge Hotspots ตอนนี้</span>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {hotspots.map((s, i) => (
                <div key={i} className="sp-card-dark" style={{ padding: '0.875rem', minWidth: '155px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--n-200)', fontSize: '0.9rem' }}>{s.city}</span>
                    <CloudRain size={13} style={{ color: 'oklch(65% 0.12 220)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Zap size={11} style={{ color: 'var(--brand-400)' }} />
                    <span className="sp-caps" style={{ color: 'var(--brand-400)' }}>+20% Surge</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Orders ── */}
        <div className="sp-section-header" style={{ marginBottom: '1rem' }}>
          <h1 className="sp-font-display sp-text-md" style={{ fontWeight: 900, color: 'var(--n-100)' }}>งานใกล้คุณ</h1>
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>{orders.length} งาน</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
            <p className="sp-caps" style={{ color: 'var(--n-700)', marginTop: '1rem' }}>กำลังสแกน...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="sp-card-dark" style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
            <p className="sp-font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--n-800)', lineHeight: 1 }}>ว่าง</p>
            <p className="sp-caps" style={{ color: 'var(--n-700)', marginTop: '1rem' }}>ระบบจะแจ้งเตือนทันทีที่มีงาน</p>
          </div>
        ) : (
          <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {orders.map(order => (
              <div key={order.id} className="sp-card-dark" style={{ padding: 0, overflow: 'hidden' }}>
                {order.weatherWarning && <div style={{ height: '3px', background: 'var(--brand-500)' }} />}
                <div style={{ padding: '1.125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-400)' }}>{order.trackingNumber}</p>
                      <p style={{ fontWeight: 600, color: 'var(--n-100)', marginTop: '0.125rem' }}>{order.productName}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="sp-font-display" style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--n-50)' }}>฿{(order.totalPrice || order.price)?.toLocaleString()}</p>
                      {order.weatherWarning && <span className="sp-caps" style={{ color: 'var(--brand-400)' }}>Surge +20%</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
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

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
                    <MapPin size={13} style={{ color: 'var(--n-700)', flexShrink: 0, marginTop: '0.1rem' }} />
                    <p style={{ color: 'var(--n-500)', fontSize: '0.85rem' }}>{order.receiverName} — {order.address}</p>
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
