'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Navigation, MapPin, Clock, Phone, ExternalLink, 
  RefreshCw, TrendingDown, CheckCircle, AlertTriangle, Package, Shield
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getCookie } from '@/lib/cookies';
import ThemeToggle from '@/components/ThemeToggle';
import RouteOptimizationMap, { OptimizedStopItem } from '@/components/RouteOptimizationMap';

interface RouteOptimizationResponse {
  origin: { lat: number; lng: number } | null;
  originType: 'DRIVER_GPS' | 'FIRST_ORDER' | 'NONE';
  totalStops: number;
  totalDistanceKm: number;
  totalEstimatedDurationMin: number;
  unoptimizedTotalDistanceKm: number;
  savedDistanceKm: number;
  savingsPercentage: number;
  stops: OptimizedStopItem[];
  unroutedOrders: Array<{
    orderId: number;
    trackingNumber: string;
    receiverName: string;
    address: string;
    reason: string;
  }>;
  googleMapsUrl: string | null;
}

export default function DriverRouteOptimizationPage() {
  const router = useRouter();
  const [data, setData] = useState<RouteOptimizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied'>('acquiring');

  // ตรวจสอบสิทธิ์คนขับ
  useEffect(() => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') {
      router.push('/login');
    }
  }, [router]);

  // ขอพิกัด GPS ปัจจุบันของคนขับ
  const acquireGPS = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus('denied');
        resolve(null);
        return;
      }

      setGpsStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setGpsCoords(coords);
          setGpsStatus('ready');
          resolve(coords);
        },
        (error) => {
          console.warn('GPS geolocation warning:', error.message);
          setGpsStatus('denied');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 },
      );
    });
  }, []);

  // ดึงข้อมูลเส้นทางที่ถูกจัดลำดับแล้วจาก Backend
  const fetchOptimizedRoute = useCallback(async (forcedCoords?: { lat: number; lng: number } | null) => {
    try {
      const coords = forcedCoords !== undefined ? forcedCoords : await acquireGPS();
      let query = '';
      if (coords) {
        query = `?lat=${coords.lat}&lng=${coords.lng}`;
      }

      const res = await fetch(`/api/proxy/orders/driver/route-optimization${query}`);
      if (res.ok) {
        const json: RouteOptimizationResponse = await res.json();
        setData(json);
      } else {
        toast.error('ไม่สามารถคำนวณเส้นทางได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('Failed to fetch optimized route:', err);
      toast.error('การเชื่อมต่อขัดข้อง');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [acquireGPS]);

  useEffect(() => {
    fetchOptimizedRoute();
  }, [fetchOptimizedRoute]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    toast.loading('กำลังตรวจพิกัดและจัดเส้นทางใหม่...', { id: 'route-refresh' });
    const coords = await acquireGPS();
    await fetchOptimizedRoute(coords);
    toast.success('อัปเดตเส้นทางเรียบร้อยแล้ว', { id: 'route-refresh' });
  };

  const handleOpenGoogleMaps = () => {
    if (!data?.googleMapsUrl) {
      toast.error('ไม่พบลิงก์นำทาง Google Maps หรือยังไม่มีจุดจัดส่ง');
      return;
    }
    window.open(data.googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenSingleStop = (stop: OptimizedStopItem) => {
    const originStr = data?.origin ? `${data.origin.lat},${data.origin.lng}` : '';
    const destStr = `${stop.lat},${stop.lng}`;
    const singleUrl = originStr
      ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destStr}`;
    window.open(singleUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="sp-page min-h-screen">
      <Toaster position="top-right" />

      {/* ── Navbar ── */}
      <nav className="sp-nav">
        <div className="flex items-center gap-3">
          <Link
            href="/driver"
            className="flex items-center gap-1.5 text-[var(--n-600)] hover:text-[var(--n-900)] text-xs font-bold uppercase transition-colors"
          >
            <ArrowLeft size={16} /> แดชบอร์ด
          </Link>
          <span className="sp-caps text-[var(--n-400)] border-l border-[var(--n-200)] pl-3">
            Route Optimizer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="sp-btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-[var(--n-200)] hover:bg-[var(--n-100)]"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[var(--brand-500)]' : ''} />
            <span className="hidden sm:inline">คำนวณใหม่</span>
          </button>
        </div>
      </nav>

      <main className="max-w-[760px] mx-auto py-8 px-4 sm:px-6">
        {/* ── Page Header ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="sp-caps text-[var(--brand-500)] text-xs font-bold flex items-center gap-1">
                <Navigation size={13} /> Multi-Stop TSP Algorithm
              </span>
              <h1 className="sp-font-display text-2xl sm:text-3xl font-black text-[var(--n-900)] mt-1">
                จัดลำดับเส้นทางส่งอัตโนมัติ
              </h1>
            </div>

            {/* GPS Status Indicator Badge */}
            <div className="flex items-center gap-2">
              {gpsStatus === 'ready' && (
                <span className="sp-badge bg-green-50 text-green-700 border border-green-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  ใช้ GPS สดของคนขับ
                </span>
              )}
              {gpsStatus === 'denied' && (
                <span className="sp-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold">
                  พิกัดเริ่มต้น: จุดส่งแรก
                </span>
              )}
              {gpsStatus === 'acquiring' && (
                <span className="sp-badge bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <RefreshCw size={11} className="animate-spin" /> ค้นหา GPS...
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-3 border-[var(--n-200)] border-t-[var(--brand-500)] rounded-full animate-spin mx-auto" />
            <p className="sp-caps text-[var(--n-500)] mt-4 text-sm font-bold">
              กำลังวิเคราะห์พิกัดและคำนวณเส้นทางที่สั้นที่สุด...
            </p>
          </div>
        ) : !data || data.totalStops === 0 ? (
          /* Empty State */
          <div className="sp-card text-center py-16 px-6 rounded-2xl border border-[var(--n-200)] bg-[var(--n-50)]">
            <div className="w-16 h-16 bg-[var(--brand-100)] text-[var(--brand-600)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>
            <h3 className="sp-font-display text-xl font-bold text-[var(--n-900)]">
              ยังไม่มีออเดอร์ที่ต้องจัดส่งในขณะนี้
            </h3>
            <p className="text-[var(--n-500)] text-sm max-w-[360px] mx-auto mt-2 leading-relaxed">
              เมื่อคุณกดรับงานที่มีสถานะกำลังจัดส่ง ระบบจะคำนวณลำดับจุดส่งที่ประหยัดเวลาและพลังงานมากที่สุดให้ทันที
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/driver/radar"
                className="sp-btn-primary px-5 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2"
              >
                <Navigation size={16} /> ไปที่หน้ารับงาน (เรดาร์)
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Key Metrics & Savings Highlight Banner ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="sp-card p-4 rounded-xl border border-[var(--n-200)] bg-[var(--n-50)] text-center">
                <span className="text-[11px] font-bold text-[var(--n-500)] uppercase tracking-wider block">
                  จำนวนจุดส่ง
                </span>
                <span className="sp-font-display text-2xl font-black text-[var(--n-900)] mt-1 block">
                  {data.totalStops} <span className="text-xs font-normal text-[var(--n-500)]">จุด</span>
                </span>
              </div>

              <div className="sp-card p-4 rounded-xl border border-[var(--n-200)] bg-[var(--n-50)] text-center">
                <span className="text-[11px] font-bold text-[var(--n-500)] uppercase tracking-wider block">
                  ระยะทางรวม
                </span>
                <span className="sp-font-display text-2xl font-black text-[var(--brand-600)] mt-1 block">
                  {data.totalDistanceKm} <span className="text-xs font-normal text-[var(--n-500)]">กม.</span>
                </span>
              </div>

              <div className="sp-card p-4 rounded-xl border border-[var(--n-200)] bg-[var(--n-50)] text-center">
                <span className="text-[11px] font-bold text-[var(--n-500)] uppercase tracking-wider block">
                  เวลาประมาณการ
                </span>
                <span className="sp-font-display text-2xl font-black text-[var(--n-900)] mt-1 block">
                  ~{data.totalEstimatedDurationMin} <span className="text-xs font-normal text-[var(--n-500)]">นาที</span>
                </span>
              </div>
            </div>

            {/* Savings Notice Card */}
            {data.savedDistanceKm > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                  <TrendingDown size={22} />
                </div>
                <div className="text-sm">
                  <p className="font-extrabold text-emerald-800 text-base">
                    ประหยัดระยะทางได้ {data.savedDistanceKm} กม. (-{data.savingsPercentage}%)
                  </p>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    เทียบกับลำดับเดิมที่ต้องวิ่ง {data.unoptimizedTotalDistanceKm} กม. (คำนวณด้วย Nearest Neighbor TSP)
                  </p>
                </div>
              </div>
            )}

            {/* ── ⭐ PRIMARY CTA: เปิด Google Maps นำทางทั้งหมดในคลิกเดียว ── */}
            <div className="sp-card p-5 rounded-2xl border-2 border-[var(--brand-500)] bg-gradient-to-br from-[var(--brand-50)] to-white shadow-md">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-500)] animate-pulse" />
                    <span className="text-xs font-extrabold text-[var(--brand-600)] uppercase tracking-wider">
                      Turn-By-Turn Full Route Navigation
                    </span>
                  </div>
                  <h3 className="sp-font-display text-lg font-black text-[var(--n-900)] mt-1">
                    นำทางจัดส่งทุกจุดต่อเนื่อง
                  </h3>
                  <p className="text-[var(--n-600)] text-xs mt-0.5">
                    เปิดแอป Google Maps พร้อมโหลดจุดแวะ (Waypoints) ทั้ง {data.totalStops} จุดตามลำดับอัตโนมัติ
                  </p>
                </div>

                <button
                  onClick={handleOpenGoogleMaps}
                  className="sp-btn-primary px-6 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <ExternalLink size={18} />
                  เปิด Google Maps นำทางทั้งหมด
                </button>
              </div>
            </div>

            {/* ── Interactive Route Map ── */}
            <div className="sp-card p-0 overflow-hidden rounded-2xl border border-[var(--n-200)] shadow-sm">
              <div className="p-4 bg-[var(--n-50)] border-b border-[var(--n-200)] flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--n-800)] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={15} className="text-[var(--brand-500)]" /> แผนที่เส้นทางจัดส่ง
                </span>
                <span className="text-[11px] text-[var(--n-500)] font-medium">
                  {data.originType === 'DRIVER_GPS' ? '🟢 เริ่มจากตำแหน่งปัจจุบัน' : '📍 เริ่มจากจุดแรก'}
                </span>
              </div>
              <div className="p-2 sm:p-3">
                <RouteOptimizationMap
                  origin={data.origin}
                  originType={data.originType}
                  stops={data.stops}
                  height="340px"
                />
              </div>
            </div>

            {/* ── Unrouted Orders Warning (if any) ── */}
            {data.unroutedOrders && data.unroutedOrders.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm mb-2 text-amber-800">
                  <AlertTriangle size={18} />
                  พบ {data.unroutedOrders.length} ออเดอร์ที่ยังไม่มีพิกัด GPS:
                </div>
                <div className="space-y-1.5 pl-6">
                  {data.unroutedOrders.map((un, idx) => (
                    <div key={idx} className="text-xs flex justify-between items-center text-amber-800">
                      <span>• <strong>{un.trackingNumber}</strong> ({un.receiverName}) — {un.address}</span>
                      <Link
                        href={`/driver/orders/${un.orderId}`}
                        className="underline text-[11px] font-bold text-amber-900 ml-2"
                      >
                        ดูออเดอร์
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step-by-Step Delivery Stops List ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="sp-font-display text-lg font-bold text-[var(--n-900)]">
                  ลำดับจุดจัดส่งตามแผน ({data.totalStops} จุด)
                </h3>
                <span className="text-xs text-[var(--n-500)]">เรียงลำดับใกล้ที่สุดไปไกลที่สุด</span>
              </div>

              <div className="space-y-3">
                {data.stops.map((stop) => (
                  <div
                    key={stop.orderId}
                    className="sp-card p-4 rounded-xl border border-[var(--n-200)] hover:border-[var(--brand-400)] transition-all bg-[var(--n-50)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Step Badge */}
                        <div className="w-9 h-9 rounded-full bg-[var(--brand-500)] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          {stop.step}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-base text-[var(--n-900)]">
                              {stop.receiverName}
                            </span>
                            <span className="sp-mono text-[11px] font-bold text-[var(--brand-600)] bg-[var(--brand-50)] px-2 py-0.5 rounded">
                              {stop.trackingNumber}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--n-200)] text-[var(--n-700)]">
                              {stop.status}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--n-600)] mt-1.5 flex items-start gap-1">
                            <MapPin size={13} className="text-[var(--n-400)] shrink-0 mt-0.5" />
                            <span>{stop.address}</span>
                          </p>

                          {/* Leg Distance & Estimated Minutes */}
                          <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                            <span className="text-[var(--brand-600)] flex items-center gap-1">
                              <Navigation size={12} /> +{stop.legDistanceKm} กม.
                            </span>
                            <span className="text-[var(--n-500)] flex items-center gap-1">
                              <Clock size={12} /> ~{stop.estimatedMinutesFromPrev} นาที
                            </span>
                            {stop.receiverPhone && (
                              <a
                                href={`tel:${stop.receiverPhone}`}
                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                <Phone size={12} /> {stop.receiverPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stop Action Buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenSingleStop(stop)}
                          title="เปิดนำทางเฉพาะจุดนี้"
                          className="sp-btn-ghost text-xs px-2.5 py-1.5 rounded-lg border border-[var(--n-200)] hover:bg-[var(--n-200)] flex items-center gap-1 text-[var(--n-700)] font-semibold"
                        >
                          <Navigation size={12} /> นำทางจุดนี้
                        </button>
                        <Link
                          href={`/driver/orders/${stop.orderId}`}
                          className="sp-btn-ghost text-xs px-2.5 py-1.5 rounded-lg border border-[var(--n-200)] hover:bg-[var(--n-200)] flex items-center justify-center text-[var(--brand-600)] font-bold text-center no-underline"
                        >
                          ดูออเดอร์
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

