'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Package, Clock, MapPin, Truck, CheckCircle, AlertTriangle, 
  ArrowLeft, Search, Share2, Wifi, WifiOff, RefreshCw 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import OrderMap from '@/components/OrderMap';
import { shareTracking } from '@/lib/share';
import { createPublicSocket, SocketConnectionState } from '@/lib/socket';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { 
    PENDING: 'sp-badge sp-badge-pending', 
    ACCEPTED: 'sp-badge sp-badge-accepted', 
    PICKED_UP: 'sp-badge sp-badge-picked', 
    SHIPPING: 'sp-badge sp-badge-shipping', 
    DELIVERED: 'sp-badge sp-badge-delivered', 
    CANCELLED: 'sp-badge sp-badge-cancelled' 
  };
  return <span className={map[status] || 'sp-badge sp-badge-pending'}>{status}</span>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.message || 'Tracking number not found');
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export default function TrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trackingNumber = params.id as string;
  
  const [isLive, setIsLive] = useState(false);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('connecting');

  // SWR for Caching, Revalidation and Background Fetching
  const { 
    data: order, 
    error, 
    isLoading, 
    isValidating, 
    mutate 
  } = useSWR(
    trackingNumber ? `/api/proxy/orders/track/${trackingNumber}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Background fallback polling every 30s
      dedupingInterval: 4000,
      keepPreviousData: true,
    }
  );

  // WebSocket Subscription & Optimistic Updates
  useEffect(() => {
    if (!trackingNumber) return;

    const socket = createPublicSocket();

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('subscribe_tracking', { trackingNumber });
      // Revalidate cache on connect / reconnect
      mutate();
    });

    socket.on('disconnect', (reason) => {
      setConnectionState('disconnected');
      setIsLive(false);
    });

    socket.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.on('connect_error', () => {
      setConnectionState('error');
    });

    // Real-time location updates
    socket.on('location_updated', (payload: { lat: number; lng: number; heading?: number }) => {
      setIsLive(true);
      // Optimistic cache mutation for driver coordinates
      mutate((current: any) => {
        if (!current) return current;
        return {
          ...current,
          driverLat: payload.lat,
          driverLng: payload.lng,
        };
      }, false);
    });

    // Real-time status update
    socket.on('order_status_update', (updatedOrder: any) => {
      toast.success(`สถานะพัสดุอัปเดตเป็น: ${updatedOrder.status}`, { icon: '📦' });
      // Mutate and revalidate in background to fetch complete tracking logs
      mutate((current: any) => {
        if (!current) return updatedOrder;
        return {
          ...current,
          ...updatedOrder,
          status: updatedOrder.status || current.status,
        };
      }, true);
    });

    return () => {
      socket.disconnect();
    };
  }, [trackingNumber, mutate]);

  if (isLoading) {
    return (
      <div className="sp-page flex items-center justify-center min-h-[60vh]">
        <div className="sp-spinner sp-spinner-lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="sp-page flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-[var(--error-bg)] text-[var(--error-text)] flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h1 className="sp-font-display sp-text-lg text-[var(--n-900)]">
          {error?.message || 'Order Not Found'}
        </h1>
        <p className="text-[var(--n-500)] mb-8 text-center max-w-md">
          หมายเลขพัสดุที่คุณระบุอาจไม่ถูกต้อง หรือยังไม่มีข้อมูลในระบบ SwiftPath
        </p>
        <button 
          onClick={() => router.push('/')} 
          className="sp-btn-primary flex items-center gap-2 rounded-lg"
        >
          <ArrowLeft size={16} /> กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  const statuses = [
    { key: 'PENDING', label: 'Order Placed', icon: Package },
    { key: 'ACCEPTED', label: 'Driver Assigned', icon: CheckCircle },
    { key: 'PICKED_UP', label: 'Picked Up', icon: Package },
    { key: 'SHIPPING', label: 'Out for Delivery', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: MapPin },
  ];

  const currentStatusIndex = statuses.findIndex(s => s.key === order.status) >= 0 
    ? statuses.findIndex(s => s.key === order.status) 
    : (order.status === 'CANCELLED' ? -1 : 0);

  const handleShare = async () => {
    const result = await shareTracking(order.trackingNumber);
    if (result === 'copied') {
      toast.success('คัดลอกลิงก์แล้ว นำไปวางส่งต่อได้เลย');
    } else if (result === 'failed') {
      toast.error('ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  return (
    <div className="sp-page">
      {/* Nav */}
      <nav className="sp-nav bg-white border-b border-[var(--n-200)] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="sp-logo">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
        </div>
        <button 
          onClick={() => router.push('/')} 
          className="sp-link-muted flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-sm"
        >
          <Search size={16} /> กลับหน้าหลัก
        </button>
      </nav>

      <main className="sp-container max-w-[800px] pt-8 pb-12">

        {/* ── Connection & Revalidation Notification Banners (Fallback UI) ── */}
        {connectionState === 'reconnecting' && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between mb-4 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              กำลังเชื่อมต่อสัญญาณสดใหม่ (Reconnecting)... ระบบกำลังดึงข้อมูลสำรองอัตโนมัติ
            </span>
            <button 
              onClick={() => mutate()} 
              disabled={isValidating}
              className="flex items-center gap-1 underline text-amber-900 cursor-pointer"
            >
              <RefreshCw size={12} className={isValidating ? 'animate-spin' : ''} /> รีเฟรช
            </button>
          </div>
        )}

        {(connectionState === 'disconnected' || connectionState === 'error') && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between mb-4">
            <span className="flex items-center gap-2">
              <WifiOff size={14} className="text-rose-600" />
              การเชื่อมต่อสัญญาณสดขาดหาย • กำลังทำงานในโหมด Background Fetching สำรอง
            </span>
            <button 
              onClick={() => mutate()} 
              disabled={isValidating}
              className="flex items-center gap-1 underline text-rose-900 cursor-pointer"
            >
              <RefreshCw size={12} className={isValidating ? 'animate-spin' : ''} /> ลองเชื่อมใหม่
            </button>
          </div>
        )}
        
        {/* Header Section */}
        <div className="sp-card sp-animate p-8 mb-6 bg-white">
          <div className="flex flex-wrap justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="sp-caps text-[var(--n-400)]">Tracking Number</p>
                {connectionState === 'connected' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[0.65rem] font-semibold border border-emerald-200">
                    <Wifi size={10} /> สัญญาณสด
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[0.65rem] font-semibold">
                    <RefreshCw size={10} className={isValidating ? 'animate-spin' : ''} /> Polling 30s
                  </span>
                )}
              </div>
              <h1 className="sp-font-display sp-text-xl font-black text-[var(--n-900)]">
                {order.trackingNumber}
              </h1>
              <p className="text-[var(--n-600)] font-semibold mt-2 flex items-center gap-2">
                <Package size={16} /> {order.productName || (order.orderItems?.[0]?.productName) || 'พัสดุ'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
               <StatusBadge status={order.status} />
               <button
                 onClick={handleShare}
                 className="sp-btn-ghost inline-flex items-center gap-1.5 text-sm"
                 aria-label="ส่งต่อลิงก์ติดตามพัสดุ"
               >
                 <Share2 size={16} /> ส่งต่อ
               </button>
            </div>
          </div>

          {/* Progress Bar */}
          {order.status !== 'CANCELLED' && (
            <div className="mt-10 relative">
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-[var(--n-100)] z-0" />
              <div 
                className={`absolute top-6 left-6 h-0.5 bg-[var(--brand-500)] transition-[width] duration-500 ease-out z-[1] ${
                  currentStatusIndex <= 0 
                    ? 'w-0' 
                    : currentStatusIndex === 1 
                    ? 'w-1/4' 
                    : currentStatusIndex === 2 
                    ? 'w-2/4' 
                    : currentStatusIndex === 3 
                    ? 'w-3/4' 
                    : 'w-full'
                }`}
              />
              
              <div className="flex justify-between relative z-[2]">
                {statuses.map((step, index) => {
                  const isActive = index <= currentStatusIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-3 w-20">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-[var(--brand-500)] text-white border-none' 
                          : 'bg-white text-[var(--n-400)] border-2 border-[var(--n-200)]'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <span className={`text-xs font-semibold text-center leading-tight ${
                        isActive ? 'text-[var(--n-900)]' : 'text-[var(--n-400)]'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weather & ETA Alerts */}
          {(order.weatherWarning || (order.estimatedMinutes && order.status !== 'DELIVERED' && order.status !== 'CANCELLED')) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {order.estimatedMinutes && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div className="flex-1 min-w-[200px] flex items-center gap-3 p-4 bg-[var(--n-50)] rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-[var(--n-200)] flex items-center justify-center text-[var(--n-600)]">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="sp-caps text-[var(--n-500)]">Estimated Time</p>
                    <p className="text-base font-bold text-[var(--n-900)]">ประมาณ {order.estimatedMinutes} นาที</p>
                  </div>
                </div>
              )}
              {order.weatherWarning && (
                <div className="flex-1 min-w-[200px] flex items-center gap-3 p-4 bg-[var(--error-bg)] rounded-xl border border-red-500/10">
                  <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-[var(--error-text)]">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="sp-caps text-[var(--error-text)]">Weather Update</p>
                    <p className="text-[0.85rem] font-semibold text-[var(--error-text)] leading-snug">{order.weatherWarning}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
          
          {/* Map Section */}
          <div className="sp-card sp-stagger p-0 overflow-hidden flex flex-col bg-white">
            <div className="py-5 px-6 border-b border-[var(--n-200)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[var(--brand-500)]" />
                <h2 className="text-base font-extrabold text-[var(--n-900)]">Live Location</h2>
              </div>
              {isLive && (
                <div className="flex items-center gap-1.5 py-1 px-2.5 bg-emerald-100 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[0.7rem] font-bold text-emerald-800">LIVE GPS</span>
                </div>
              )}
            </div>
            <div className="h-[300px] w-full relative bg-[var(--n-50)]">
              <OrderMap 
                lat={order.lat || 13.7563} 
                lng={order.lng || 100.5018} 
                label={order.address || 'ปลายทาง'} 
                trackingNumber={order.trackingNumber}
                driverLat={order.driverLat}
                driverLng={order.driverLng}
                onLiveStatusChange={setIsLive}
                height="300px"
              />
            </div>
            {order.driver && (
              <div className="p-4 px-6 bg-[var(--n-50)] border-t border-[var(--n-200)] flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--n-200)] flex items-center justify-center font-extrabold text-[var(--n-600)]">
                  {order.driver.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className="text-[0.9rem] font-bold text-[var(--n-900)]">{order.driver.name || 'SwiftPath Driver'}</p>
                  <p className="text-xs text-[var(--n-500)]">{order.driver.vehiclePlate || 'Vehicle'} • {order.driver.vehicleType || 'Standard'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div className="sp-card sp-stagger p-6 bg-white [animation-delay:100ms]">
            <h2 className="text-base font-extrabold text-[var(--n-900)] mb-6 flex items-center gap-2">
              <Clock size={18} className="text-[var(--brand-500)]" /> Tracking History
            </h2>
            <div className="flex flex-col gap-0">
              {!order.trackingLogs || order.trackingLogs.length === 0 ? (
                <p className="text-[var(--n-500)] text-[0.9rem] text-center py-8">
                  ยังไม่มีประวัติสถานะเพิ่มเติมในขณะนี้
                </p>
              ) : (
                order.trackingLogs.map((log: any, index: number) => {
                  const isLatest = index === 0;
                  return (
                    <div 
                      key={log.id} 
                      className={`flex gap-4 relative ${index === order.trackingLogs.length - 1 ? 'pb-0' : 'pb-6'}`}
                    >
                      {/* Vertical Line */}
                      {index !== order.trackingLogs.length - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-[var(--n-200)] z-0" />
                      )}
                      {/* Dot */}
                      <div className="relative z-[1] mt-1">
                        <div className={`w-4 h-4 rounded-full border-[3px] border-white shadow-[0_0_0_1px_var(--n-200)] ${
                          isLatest ? 'bg-[var(--brand-500)]' : 'bg-[var(--n-200)]'
                        }`} />
                      </div>
                      {/* Content */}
                      <div className={`flex-1 rounded-lg ${
                        isLatest 
                          ? 'bg-[var(--n-50)] p-3 border border-[var(--n-200)] -mt-2' 
                          : 'bg-transparent p-0 border-none mt-0'
                      }`}>
                        <p className={`text-[0.85rem] font-bold mb-1 ${
                          isLatest ? 'text-[var(--n-900)]' : 'text-[var(--n-500)]'
                        }`}>
                          {log.note}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[var(--n-400)]">
                          <span>
                            {new Date(log.createdAt).toLocaleString('th-TH', { 
                              timeZone: 'Asia/Bangkok',
                              month: 'short', 
                              day: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {log.location && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-[var(--n-300)]" />
                              <span>{log.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
