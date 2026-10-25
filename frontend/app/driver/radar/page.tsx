'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  MapPin, Clock, Shield, Zap, CheckCircle, CloudRain, LogOut, 
  ArrowLeft, RefreshCw, Package, Wifi, WifiOff 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useHaptic } from '@/hooks/useHaptic';
import { useSound } from '@/hooks/useSound';
import EmptyState from '@/components/EmptyState';
import OrderSkeleton from '@/components/OrderSkeleton';
import ThemeToggle from '@/components/ThemeToggle';
import { createAuthenticatedSocket, SocketConnectionState } from '@/lib/socket';

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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.message || 'Failed to fetch');
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export default function DriverRadarPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const triggerHaptic = useHaptic();
  const playSound = useSound();

  const [accepting, setAccepting] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('connecting');
  const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'https://project-wi39.onrender.com');

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  // ตรวจสอบสิทธิ์คนขับ
  useEffect(() => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') {
      router.push('/driver/login');
    }
  }, [router]);

  // SWR: Available Orders (Caching + Background Polling fallback every 30s)
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isValidating: ordersValidating,
    mutate: mutateOrders,
  } = useSWR<any[]>(
    '/api/proxy/orders/available',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
      dedupingInterval: 4000,
    }
  );

  // SWR: Weather Hotspots (Polling every 2 mins)
  const {
    data: hotspots = [],
    mutate: mutateHotspots,
  } = useSWR<any[]>(
    '/api/proxy/weather/hotspots',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 120000,
      dedupingInterval: 10000,
    }
  );

  // WebSocket Connection & Real-time Optimistic Updates
  useEffect(() => {
    let socket: any = null;
    let isMounted = true;

    async function setupSocket() {
      socket = await createAuthenticatedSocket();
      if (!socket || !isMounted) return;

      socket.on('connect', () => {
        if (!isMounted) return;
        setConnectionState('connected');
        // Revalidate cache on connect/reconnect
        mutateOrders();
        mutateHotspots();
      });

      socket.on('disconnect', () => {
        if (!isMounted) return;
        setConnectionState('disconnected');
      });

      socket.on('reconnect_attempt', () => {
        if (!isMounted) return;
        setConnectionState('reconnecting');
      });

      socket.on('connect_error', () => {
        if (!isMounted) return;
        setConnectionState('error');
      });

      // Real-time: มีออเดอร์ใหม่เข้ามา
      socket.on('new_available_order', (newOrder: any) => {
        if (!isMounted) return;
        playSound();
        triggerHaptic();
        toast.success(`มีงานใหม่เข้ามา: ฿${(newOrder.totalPrice || newOrder.price)?.toLocaleString()}`, { icon: '🔔' });

        // Optimistic mutation: ใส่ Order ใหม่ลง Cache ทันทีโดยไม่ต้องรอ Fetch
        mutateOrders((currentOrders = []) => {
          if (currentOrders.some((o: any) => o.id === newOrder.id)) return currentOrders;
          return [newOrder, ...currentOrders];
        }, false);
      });

      // Real-time: มีคนขับคนอื่นรับงานไปแล้ว
      socket.on('order_taken', (data: { orderId: number }) => {
        if (!isMounted) return;
        // Mutate cache: ลบงานที่ถูกรับแล้วออกจากรายการทันที
        mutateOrders((currentOrders = []) => {
          return (currentOrders || []).filter((o: any) => o.id !== data.orderId);
        }, false);
      });
    }

    setupSocket();

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
  }, [mutateOrders, mutateHotspots, playSound, triggerHaptic]);

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
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);

    // ใช้ OpenStreetMap แทน CARTO เพราะ CARTO บังคับใช้ API key แล้ว
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const tilePane = tileLayer.getContainer();
    if (tilePane) {
      tilePane.classList.add('sp-radar-tile-invert');
    }

    mapInstanceRef.current = map;

    // Trigger resize to fix grey/black screen issues
    setTimeout(() => {
      map.invalidateSize();
    }, 400);
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

  // Optimistic Mutation: รับงาน
  const handleAccept = async (orderId: number) => {
    triggerHaptic();
    setAccepting(orderId);

    const previousOrders = orders || [];
    const optimisticOrders = previousOrders.filter((o: any) => o.id !== orderId);

    try {
      await mutateOrders(
        async () => {
          const res = await fetch(`/api/proxy/orders/${orderId}/accept`, { method: 'PATCH' });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'ไม่สามารถรับงานได้');
          }
          return optimisticOrders;
        },
        {
          optimisticData: optimisticOrders,
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      );

      toast.success('รับงานสำเร็จ!');
      router.push(`/driver/orders/${orderId}`);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถรับงานได้');
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="sp-page">
      {/* Nav */}
      <nav className="sp-nav">
        <button onClick={() => router.push('/driver')} className="sp-btn-ghost sp-btn-icon" aria-label="กลับหน้าหลัก">
          <ArrowLeft size={18} />
        </button>
        <span className="sp-logo">Fleet<span className="sp-logo-accent">Radar</span></span>
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {connectionState === 'connected' ? (
            <span className="sp-caps text-[var(--success-text)] flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-text)] inline-block animate-pulse" />
              Live Radar
            </span>
          ) : connectionState === 'reconnecting' ? (
            <span className="sp-caps text-amber-600 flex items-center gap-1.5 text-xs font-semibold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Reconnecting
            </span>
          ) : (
            <span className="sp-caps text-rose-500 flex items-center gap-1.5 text-xs font-semibold">
              <WifiOff size={12} />
              Offline
            </span>
          )}

          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/driver/login';
            }}
            className="bg-transparent border-none cursor-pointer text-[var(--n-600)] flex opacity-60 hover:opacity-100 transition-opacity"
            aria-label="ออกจากระบบ"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Leaflet Map */}
      <div className="sp-radar-map">
        <div ref={mapRef} className="sp-radar-canvas" />
        <div className="sp-radar-scrim" aria-hidden="true" />

        <span className="sp-radar-chip">
          <span className="sp-radar-chip-dot" />
          แผนที่ความต้องการทั่วประเทศ
        </span>

        {/* Map overlay: ไม่มี Hotspot */}
        {mapReady && hotspots.length === 0 && (
          <div className="sp-radar-idle">
            <span className="sp-radar-sweep" aria-hidden="true" />
            <p className="sp-caps sp-radar-idle-text">ไม่มี Surge Hotspot ในขณะนี้</p>
          </div>
        )}

        {/* Legend */}
        {hotspots.length > 0 && (
          <div className="sp-radar-legend">
            <p className="sp-caps mb-1 opacity-80">Surge Hotspots ({hotspots.length})</p>
            {hotspots.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <CloudRain size={11} className="text-[var(--brand-400)]" />
                <span className="text-xs">{s.city}</span>
                <Zap size={10} className="text-[var(--brand-400)]" />
                <span className="sp-caps text-[0.7rem] text-[var(--brand-400)]">+20%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders List */}
      <main className="sp-container max-w-[600px] pt-8 pb-12">
        {/* ── Connection & Revalidation Notification Banners (Fallback UI) ── */}
        {connectionState === 'reconnecting' && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between mb-4 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              กำลังเชื่อมต่อเรดาร์ใหม่ (Reconnecting)... ระบบกำลังดึงงานผ่าน Background Fetching
            </span>
            <button 
              onClick={() => mutateOrders()} 
              disabled={ordersValidating}
              className="flex items-center gap-1 underline text-amber-900 cursor-pointer bg-transparent border-none text-xs"
            >
              <RefreshCw size={12} className={ordersValidating ? 'animate-spin' : ''} /> รีเฟรช
            </button>
          </div>
        )}

        {(connectionState === 'disconnected' || connectionState === 'error') && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between mb-4">
            <span className="flex items-center gap-2">
              <WifiOff size={14} className="text-rose-600" />
              สัญญาณเรดาร์สดขาดหาย • กำลังทำงานในโหมด Background Fetching สำรอง
            </span>
            <button 
              onClick={() => mutateOrders()} 
              disabled={ordersValidating}
              className="flex items-center gap-1 underline text-rose-900 cursor-pointer bg-transparent border-none text-xs"
            >
              <RefreshCw size={12} className={ordersValidating ? 'animate-spin' : ''} /> ดึงข้อมูลใหม่
            </button>
          </div>
        )}

        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-500)] shadow-[0_0_0_3px_var(--brand-100)] animate-pulse" />
              <span className="sp-caps text-[var(--brand-600)] font-bold">Scanning Sector 7G</span>
            </div>
            <h1 className="sp-font-display sp-text-md font-black text-[var(--n-900)]">งานใกล้คุณ</h1>
          </div>
          <button 
            onClick={() => {
              mutateOrders();
              mutateHotspots();
            }} 
            disabled={ordersValidating}
            className="sp-btn-ghost sp-btn-icon" 
            aria-label="รีเฟรชรายการงาน"
          >
            <RefreshCw size={16} className={ordersValidating ? 'spin' : ''} />
          </button>
        </div>

        {ordersLoading ? (
          <OrderSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState 
            icon={<CloudRain size={32} />}
            title="ว่าง"
            description="ยังไม่มีงานใหม่ในพื้นที่ของคุณ ระบบจะแจ้งเตือนทันทีที่มีงาน"
          />
        ) : (
          <div className="sp-stagger flex flex-col gap-4">
            {orders.map(order => (
              <div key={order.id} className="sp-card p-0 overflow-hidden border border-[var(--n-200)] shadow-sm rounded-xl">
                {order.weatherWarning && <div className="h-1 bg-[var(--brand-500)]" />}
                
                {/* Header Section */}
                <div className="py-4 px-5 bg-[var(--n-50)] border-b border-[var(--n-150)] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--brand-100)] rounded-lg flex items-center justify-center text-[var(--brand-600)]">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="sp-mono text-xs font-extrabold text-[var(--brand-600)]">{order.trackingNumber}</p>
                      <p className="text-sm font-bold text-[var(--n-900)] mt-0.5">{order.productName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="sp-font-display text-xl font-black text-[var(--n-900)]">฿{(order.totalPrice || order.price)?.toLocaleString()}</p>
                    {order.weatherWarning && <span className="sp-caps text-[var(--brand-600)] text-[0.65rem]">Surge +20%</span>}
                  </div>
                </div>

                {/* Body Section */}
                <div className="p-5">
                  <div className="flex gap-4 mb-4 flex-wrap">
                    {order.estimatedMinutes && (
                      <span className="sp-caps bg-[var(--n-100)] py-1.5 px-2.5 rounded-md text-[var(--n-700)] flex items-center gap-1.5 text-[0.7rem]">
                        <Clock size={12} /> ETA {order.estimatedMinutes} นาที
                      </span>
                    )}
                    {order.hasInsurance && (
                      <span className="sp-caps bg-[oklch(95%_0.05_270)] py-1.5 px-2.5 rounded-md text-[oklch(60%_0.15_270)] flex items-center gap-1.5 text-[0.7rem]">
                        <Shield size={12} /> มีประกันคุ้มครอง
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3 mb-6 bg-[var(--n-50)] p-4 rounded-lg border border-[var(--n-150)]">
                    <MapPin size={16} className="text-[var(--brand-500)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[var(--n-900)] text-sm font-bold">{order.receiverName}</p>
                      <p className="text-[var(--n-500)] text-sm mt-1 leading-snug">{order.address}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={accepting === order.id}
                    className="sp-btn-touch sp-btn-touch-full rounded-lg font-extrabold text-base p-4"
                  >
                    {accepting === order.id ? <span className="sp-spinner" /> : <><CheckCircle size={18} className="mr-2" /> รับงานนี้เลย</>}
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
