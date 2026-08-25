'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { MapPin, Clock, Shield, Zap, CheckCircle, CloudRain, LogOut } from 'lucide-react';

// พิกัดเมืองไทยสำหรับ Marker บน Map
const CITY_COORDINATES: Record<string, [number, number]> = {
  'Bangkok': [13.7563, 100.5018],
  'Chiang Mai': [18.7883, 98.9853],
  'Phuket': [7.8804, 98.3923],
  'Chonburi': [13.3611, 100.9847],
  'Khon Kaen': [16.4322, 102.8236],
  'Korat': [14.9799, 102.0978],
  'Surat Thani': [9.1382, 99.3211],
  'Hat Yai': [7.0061, 100.4747],
};

export default function DriverRadarPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [orders, setOrders] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

  const getCookie = (name: string) => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  const fetchOrders = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') { router.push('/driver/login'); return; }
    try {
      const [ordRes, hotRes] = await Promise.all([
        fetch('/api/proxy/orders/available'),
        fetch('/api/proxy/weather/hotspots'),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (hotRes.ok) setHotspots(await hotRes.json());
    } catch (err) { console.warn(err); }
    finally { setLoading(false); }
  }, [router]);

  // โหลด Leaflet แบบ Dynamic (ป้องกัน SSR Error)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // โหลด Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // โหลด Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    if (!document.getElementById('leaflet-js')) {
      script.id = 'leaflet-js';
      document.head.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  // สร้าง Map หลังจาก Leaflet โหลดเสร็จ
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // สร้าง Map ที่ศูนย์กลางประเทศไทย
    const map = L.map(mapRef.current, {
      center: [13.0, 101.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark-themed tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
  }, [mapReady]);

  // อัปเดต Marker เมื่อ Hotspots เปลี่ยน
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // ลบ Marker เก่าทั้งหมด
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    hotspots.forEach(spot => {
      const coords = CITY_COORDINATES[spot.city];
      if (!coords) return;

      const conditionColor: Record<string, string> = {
        Rain: '#f97316',
        Thunderstorm: '#ef4444',
        Drizzle: '#f97316',
      };
      const color = conditionColor[spot.condition] || '#f97316';

      // Custom Marker SVG
      const iconHtml = `
        <div style="
          width:44px; height:44px; border-radius:50%;
          background:${color}22; border:2px solid ${color};
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 0 20px ${color}44;
          animation: pulse-marker 2s infinite;
        ">
          <div style="width:16px;height:16px;border-radius:50%;background:${color};"></div>
        </div>
      `;
      const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [44, 44], iconAnchor: [22, 22] });

      // XSS Protection (CRITICAL SEC-FIX)
      const escapeHtml = (unsafe: string) => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const safeCity = escapeHtml(spot.city);
      const safeCondition = escapeHtml(spot.condition);

      const marker = L.marker(coords, { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family:sans-serif;padding:4px">
            <strong style="color:#f97316;font-size:0.9rem">${safeCity}</strong><br>
            <span style="font-size:0.8rem;color:#888">${safeCondition} — ${spot.temp}°C</span><br>
            <strong style="font-size:0.85rem;color:#22c55e">+20% Surge Pricing Active</strong>
          </div>
        `);
      markersRef.current.push(marker);
    });
  }, [hotspots, mapReady]);

  // WebSocket + Polling
  useEffect(() => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 60_000);

    let sock: Socket | null = null;
    async function initSocket() {
      try {
        const tokenRes = await fetch('/api/auth/token');
        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          if (token) {
            sock = io(SOCKET_URL, { auth: { token: `Bearer ${token}` }, withCredentials: true });
            sock.on('new_available_order', (order: any) => {
              setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev]);
            });
            sock.on('order_taken', (data: { orderId: number }) => {
              setOrders(prev => prev.filter(o => o.id !== data.orderId));
            });
          }
        }
      } catch (err) { console.warn(err); }
    }
    initSocket();
    return () => { if (sock) sock.disconnect(); clearInterval(interval); };
  }, [fetchOrders, SOCKET_URL]);

  const handleAccept = async (orderId: number) => {
    setAccepting(orderId);
    try {
      const res = await fetch(`/api/proxy/orders/${orderId}/accept`, { method: 'PATCH' });
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
    <div className="sp-page">
      <style>{`
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
      `}</style>

      {/* Nav */}
      <nav className="sp-nav">
        <button onClick={() => router.push('/driver')} className="sp-btn-ghost" style={{ padding: '0.5rem', color: 'var(--n-600)', borderColor: 'var(--n-300)' }}>
          <ArrowLeft size={18} />
        </button>
        <span className="sp-logo">Fleet<span className="sp-logo-accent">Radar</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="sp-caps" style={{ color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-text)', display: 'inline-block', animation: 'sp-in 1.2s ease-in-out infinite alternate' }} />
            Live
          </span>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/driver/login';
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-600)', display: 'flex', opacity: 0.6 }}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Leaflet Map */}
      <div style={{ position: 'relative', height: '380px', background: '#111' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Map overlay: ไม่มี Hotspot */}
        {mapReady && hotspots.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
          }}>
            <p className="sp-caps" style={{ color: 'var(--n-700)' }}>ไม่มี Surge Hotspot ในขณะนี้</p>
          </div>
        )}

        {/* Legend */}
        {hotspots.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 1000,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--n-200)', borderRadius: '10px',
            padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem'
          }}>
            <p className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '0.25rem' }}>Surge Hotspots ({hotspots.length})</p>
            {hotspots.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CloudRain size={11} style={{ color: 'var(--brand-400)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--n-800)' }}>{s.city}</span>
                <Zap size={10} style={{ color: 'var(--brand-400)' }} />
                <span className="sp-caps" style={{ fontSize: '0.7rem', color: 'var(--brand-400)' }}>+20%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders List */}
      <main className="sp-container" style={{ maxWidth: '600px', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-500)', boxShadow: '0 0 0 3px var(--brand-100)', animation: 'pulse 2s infinite' }} />
              <span className="sp-caps" style={{ color: 'var(--brand-600)', fontWeight: 700 }}>Scanning Sector 7G</span>
            </div>
            <h1 className="sp-font-display sp-text-md" style={{ fontWeight: 900, color: 'var(--n-900)' }}>งานใกล้คุณ</h1>
          </div>
          <button onClick={fetchOrders} className="sp-btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%', color: 'var(--n-600)' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="sp-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--n-50)' }}>
            <p className="sp-font-display" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--n-300)' }}>ว่าง</p>
            <p className="sp-caps" style={{ color: 'var(--n-500)', marginTop: '0.75rem' }}>ระบบจะแจ้งเตือนทันทีที่มีงาน</p>
          </div>
        ) : (
          <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => (
              <div key={order.id} className="sp-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                {order.weatherWarning && <div style={{ height: '4px', background: 'var(--brand-500)' }} />}
                
                {/* Header Section */}
                <div style={{ padding: '1rem 1.25rem', background: 'var(--n-50)', borderBottom: '1px solid var(--n-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--brand-100)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="sp-mono" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-600)' }}>{order.trackingNumber}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--n-900)', marginTop: '0.125rem' }}>{order.productName}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="sp-font-display" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--n-900)' }}>฿{(order.totalPrice || order.price)?.toLocaleString()}</p>
                    {order.weatherWarning && <span className="sp-caps" style={{ color: 'var(--brand-600)', fontSize: '0.65rem' }}>Surge +20%</span>}
                  </div>
                </div>

                {/* Body Section */}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {order.estimatedMinutes && (
                      <span className="sp-caps" style={{ background: 'var(--n-100)', padding: '0.35rem 0.65rem', borderRadius: '6px', color: 'var(--n-700)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem' }}>
                        <Clock size={12} /> ETA {order.estimatedMinutes} นาที
                      </span>
                    )}
                    {order.hasInsurance && (
                      <span className="sp-caps" style={{ background: 'oklch(95% 0.05 270)', padding: '0.35rem 0.65rem', borderRadius: '6px', color: 'oklch(60% 0.15 270)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem' }}>
                        <Shield size={12} /> มีประกันคุ้มครอง
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--n-150)' }}>
                    <MapPin size={16} style={{ color: 'var(--brand-500)', flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                      <p style={{ color: 'var(--n-900)', fontSize: '0.9rem', fontWeight: 700 }}>{order.receiverName}</p>
                      <p style={{ color: 'var(--n-500)', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: 1.4 }}>{order.address}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={accepting === order.id}
                    className="sp-btn-touch sp-btn-touch-full"
                    style={{ borderRadius: '8px', fontWeight: 800, fontSize: '1rem', padding: '1rem' }}
                  >
                    {accepting === order.id ? <span className="sp-spinner" /> : <><CheckCircle size={18} style={{ marginRight: '0.5rem' }} /> รับงานนี้เลย</>}
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
