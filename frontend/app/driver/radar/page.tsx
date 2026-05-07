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
        fetch(`${API_URL}/weather/hotspots`, { headers: h }),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (hotRes.ok) setHotspots(await hotRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [API_URL, router]);

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
    const token = getToken();
    if (!token) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 60_000);
    const sock: Socket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    sock.on('new_available_order', (order: any) => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev]);
    });
    sock.on('order_taken', (data: { orderId: number }) => {
      setOrders(prev => prev.filter(o => o.id !== data.orderId));
    });
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
      <style>{`
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
      `}</style>

      {/* Nav */}
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
          <button
            onClick={() => {
              const past = 'Thu, 01 Jan 1970 00:00:00 UTC';
              document.cookie = `token=; path=/; expires=${past}`;
              document.cookie = `role=; path=/; expires=${past}`;
              document.cookie = `token=; path=/; domain=localhost; expires=${past}`;
              window.location.href = '/login';
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
            background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
            padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem'
          }}>
            <p className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '0.25rem' }}>Surge Hotspots ({hotspots.length})</p>
            {hotspots.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CloudRain size={11} style={{ color: 'var(--brand-400)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--n-300)' }}>{s.city}</span>
                <Zap size={10} style={{ color: 'var(--brand-400)' }} />
                <span className="sp-caps" style={{ fontSize: '0.7rem', color: 'var(--brand-400)' }}>+20%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders List */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <div className="sp-section-header" style={{ marginBottom: '1rem' }}>
          <h1 className="sp-font-display sp-text-md" style={{ fontWeight: 900, color: 'var(--n-100)' }}>งานใกล้คุณ</h1>
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>{orders.length} งาน</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="sp-card-dark" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <p className="sp-font-display" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--n-800)' }}>ว่าง</p>
            <p className="sp-caps" style={{ color: 'var(--n-700)', marginTop: '0.75rem' }}>ระบบจะแจ้งเตือนทันทีที่มีงาน</p>
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
                    {accepting === order.id ? <span className="sp-spinner" /> : <><CheckCircle size={15} /> รับงานนี้</>}
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
