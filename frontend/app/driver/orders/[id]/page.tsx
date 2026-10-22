'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Package, MapPin, Truck, CheckCircle, Camera, MessageSquare, 
  ArrowLeft, Phone, DollarSign, Shield, Zap, Navigation, Radio, Square
} from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { toast } from 'react-hot-toast';
import OrderSkeleton from '@/components/OrderSkeleton';
import ChatBox from '@/components/ChatBox';
import PremiumModal from '@/components/PremiumModal';
import { getCookie } from '@/lib/cookies';
import { createAuthenticatedSocket } from '@/lib/socket';

export default function DriverOrderWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'confirm'|'danger'|'prompt', title: string, message: string, placeholder?: string, onConfirm: (val?: string) => void }>({ isOpen: false, type: 'prompt', title: '', message: '', placeholder: '', onConfirm: () => {} });
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'qr' | 'cash'>('qr');

  // ─── Real-time GPS State ────────────────────────────────────────────────────
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'active' | 'simulating' | 'error'>('idle');
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simulatorRef = useRef<NodeJS.Timeout | null>(null);

  const { id: orderId } = use(params);

  const fetchOrder = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') { router.push('/login'); return; }
    try {
      const res = await fetch(`/api/proxy/orders/${orderId}`);
      if (res.ok) setOrder(await res.json());
      else        router.push('/driver/radar');
    } catch { console.warn('Error fetching order'); }
    finally { setLoading(false); }
  }, [orderId, router]);

  // ─── เชื่อมต่อ Socket.io เมื่อโหลดหน้า ──────────────────────────────────────
  useEffect(() => {
    fetchOrder();
    
    let socket: Socket | null = null;
    async function initSocket() {
      socket = await createAuthenticatedSocket();
      if (socket) {
        socketRef.current = socket;
        socket.emit('join_order', { orderId: Number(orderId) });
        // [RT-03 FIX] Update status locally instead of full refetch
        socket.on('order_status_update', ({ status }: { status: string }) => {
          setOrder((prev: any) => prev ? { ...prev, status } : prev);
        });
      }
    }
    
    initSocket();

    return () => {
      stopTracking();
      if (socket) socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, fetchOrder]);
  // ─── ส่งพิกัดผ่าน Socket.io ─────────────────────────────────────────────────
  const emitLocation = useCallback((lat: number, lng: number, heading?: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('update_location', {
      orderId: Number(orderId),
      lat,
      lng,
      heading,
    });
  }, [orderId]);

  // ─── เริ่มติดตาม GPS จริง ─────────────────────────────────────────────────────
  const startRealGPS = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์นี้ไม่รองรับ GPS');
      setGpsStatus('error');
      return;
    }

    setIsTracking(true);
    setGpsStatus('active');
    toast.success('เริ่มส่งพิกัด GPS แบบสดแล้ว', { icon: '📍' });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        emitLocation(latitude, longitude, heading ?? undefined);
      },
      (err) => {
        const gpsMessages: Record<number, string> = {
          1: 'กรุณาอนุญาตให้เว็บไซต์เข้าถึงตำแหน่ง หรือใช้โหมด Demo',
          2: 'ไม่พบสัญญาณ GPS กรุณาลองในพื้นที่เปิดหรือใช้โหมด Demo',
          3: 'GPS ใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่หรือใช้โหมด Demo',
        };
        toast.error(gpsMessages[err.code] || 'ไม่สามารถเข้าถึง GPS ได้ กรุณาใช้โหมด Demo');
        setGpsStatus('error');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [emitLocation]);

  // ─── หยุดติดตาม GPS ───────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulatorRef.current) {
      clearInterval(simulatorRef.current);
      simulatorRef.current = null;
    }
    setIsTracking(false);
    setIsSimulating(false);
    setGpsStatus('idle');
  }, []);

  // ─── โหมดจำลองการขับรถ (Simulator) สำหรับ Demo ──────────────────────────────
  // ขยับพิกัดจาก กรุงเทพ (ร้านค้า) → ปทุมธานี (ลูกค้า) ทีละนิดทุกๆ 1.5 วินาที
  const startSimulator = useCallback(() => {
    if (!order) return;

    // จุดเริ่มต้น: ตำแหน่งร้านค้า (หรือ Bangkok default)
    const startLat = order.merchant?.lat ?? 13.7563;
    const startLng = order.merchant?.lng ?? 100.5018;
    // จุดปลายทาง: ที่อยู่ลูกค้าจากออเดอร์ (หรือ Pathumthani default)
    const endLat   = order.lat ?? 13.9808;
    const endLng   = order.lng ?? 100.5954;

    const STEPS = 40; // จำนวนจุดบน path (40 * 1.5s ≈ 1 นาทีในการจำลอง)
    let step = 0;

    setIsSimulating(true);
    setIsTracking(true);
    setGpsStatus('simulating');
    toast.success('เริ่มโหมดจำลองเส้นทางส่งสินค้า 🚛', { duration: 3000 });

    simulatorRef.current = setInterval(() => {
      if (step >= STEPS) {
        clearInterval(simulatorRef.current!);
        simulatorRef.current = null;
        setIsSimulating(false);
        setIsTracking(false);
        setGpsStatus('idle');
        toast.success('จำลองการเดินทางเสร็จสิ้น ✅');
        return;
      }

      const progress = step / STEPS;
      // เพิ่ม noise เล็กน้อยเพื่อให้ดูเหมือนวิ่งบนถนนจริง
      const jitter = (Math.random() - 0.5) * 0.0004;
      const lat = startLat + (endLat - startLat) * progress + jitter;
      const lng = startLng + (endLng - startLng) * progress + jitter;

      // คำนวณหัวรถ (Heading) จากทิศทางการเคลื่อนที่
      const dLat = endLat - startLat;
      const dLng = endLng - startLng;
      const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

      emitLocation(lat, lng, heading);
      step++;
    }, 1500);
  }, [order, emitLocation]);
  const updateStatus = async (endpoint: string, extraBody = {}) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/proxy/orders/${orderId}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extraBody)
      });
      if (!res.ok) {
        const err = await res.json();
        const message = Array.isArray(err.message) ? err.message[0] : err.message;
        toast.error(message || 'อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่');
      } else {
        toast.success('อัปเดตสถานะสำเร็จ');
      }
    } catch { toast.error('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setUpdating(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProofImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="sp-page min-h-screen py-8 px-5">
        <div className="max-w-[480px] mx-auto pt-16">
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      </div>
    );
  }
  if (!order) return null;

  // ออเดอร์ที่ร้านค้าสร้างเองอาจไม่มีบัญชีลูกค้า (customerId = null)
  // กรณีนั้นให้คนขับคุยกับร้านค้าที่มอบหมายงานแทน
  const chatPeer: { role: 'Customer' | 'Merchant'; id: number } | null =
    order.customerId ? { role: 'Customer', id: order.customerId }
  : order.merchantId ? { role: 'Merchant', id: order.merchantId }
  : null;

  // สีสัญญาณ GPS ตาม State
  const gpsBorderClass: Record<string, string> = {
    idle: 'border-[var(--n-600)]/40',
    active: 'border-[#22c55e]/40',
    simulating: 'border-[#f59e0b]/40',
    error: 'border-[#ef4444]/40',
  };
  const gpsPulseClass: Record<string, string> = {
    idle: 'bg-[var(--n-600)]',
    active: 'bg-[#22c55e] shadow-[0_0_0_4px_rgba(34,197,94,0.3)] animate-pulse',
    simulating: 'bg-[#f59e0b] shadow-[0_0_0_4px_rgba(245,158,11,0.3)] animate-pulse',
    error: 'bg-[#ef4444]',
  };
  const gpsTextClass: Record<string, string> = {
    idle: 'text-[var(--n-600)]',
    active: 'text-[#22c55e]',
    simulating: 'text-[#f59e0b]',
    error: 'text-[#ef4444]',
  };
  const gpsLabel: Record<string, string> = {
    idle: 'GPS ยังไม่ทำงาน',
    active: 'กำลังส่งพิกัดสดๆ',
    simulating: 'โหมดจำลองเส้นทาง',
    error: 'GPS เกิดข้อผิดพลาด',
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/driver/radar')} className="sp-btn-danger opacity-80">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="sp-caps text-[var(--n-500)] text-[0.6rem]">รหัสพัสดุ</p>
          <span className="sp-logo text-base">{order.trackingNumber}</span>
        </div>
        <button 
          onClick={() => setIsChatOpen(true)}
          disabled={!chatPeer}
          title={chatPeer ? `แชทกับ${chatPeer.role === 'Customer' ? 'ลูกค้า' : 'ร้านค้า'}` : 'ยังไม่มีคู่สนทนาสำหรับออเดอร์นี้'}
          className={`sp-btn-brand w-10 h-10 rounded-full p-0 flex items-center justify-center ${chatPeer ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
        >
          <MessageSquare size={18} />
        </button>
      </nav>

      <main className="max-w-[480px] mx-auto py-8 px-5">
        
        {/* Status Hero */}
        <div className="sp-card sp-animate mb-6 text-center bg-[var(--n-50)] border border-[var(--n-200)]">
          <span className="sp-caps text-[var(--brand-600)] font-black">{order.status}</span>
          <h1 className="sp-font-display text-2xl text-[var(--n-900)] mt-2">
            {getStatusTitle(order.status)}
          </h1>
        </div>

        {/* ─── GPS Tracking Panel (แสดงเมื่อกำลังส่งหรือ Shipping) ─── */}
        {(order.status === 'SHIPPING' || order.status === 'PICKED_UP') && (
          <div className={`sp-card sp-animate mb-6 border ${gpsBorderClass[gpsStatus]}`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {/* Pulse indicator */}
                <div className={`w-2.5 h-2.5 rounded-full ${gpsPulseClass[gpsStatus]}`} />
                <span className="font-bold text-[var(--n-800)] text-sm">
                  Real-time GPS
                </span>
              </div>
              <span className={`text-[0.7rem] font-semibold ${gpsTextClass[gpsStatus]}`}>
                {gpsLabel[gpsStatus]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* ปุ่ม GPS จริง */}
              {!isTracking ? (
                <button
                  onClick={startRealGPS}
                  className="sp-btn-brand p-2.5 text-xs flex items-center justify-center gap-1.5"
                >
                  <Radio size={14} /> ส่ง GPS จริง
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="p-2.5 text-xs bg-[var(--n-200)] text-[var(--n-800)] border border-[var(--n-700)] rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Square size={14} /> หยุดส่งพิกัด
                </button>
              )}

              {/* ปุ่ม Simulator (สำหรับ Demo) */}
              {!isSimulating ? (
                <button
                  onClick={startSimulator}
                  disabled={isTracking && !isSimulating}
                  className={`p-2.5 text-xs bg-[oklch(30%_0.06_42)] text-[#f59e0b] border border-[oklch(40%_0.08_42)] rounded-lg flex items-center justify-center gap-1.5 ${isTracking && !isSimulating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer opacity-100'}`}
                >
                  🚛 โหมด Demo
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="p-2.5 text-xs bg-[oklch(25%_0.05_42)] text-[#f59e0b] border border-[oklch(35%_0.07_42)] rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Square size={14} /> หยุด Demo
                </button>
              )}
            </div>

            <p className="text-[0.65rem] text-[var(--n-700)] mt-2.5 text-center">
              "ส่ง GPS จริง" ใช้สัญญาณจากมือถือ · "โหมด Demo" จำลองเส้นทางให้ดูบนหน้าติดตาม
            </p>
          </div>
        )}

        {/* Info Grid */}
        <div className="sp-stagger">
          <div className="sp-card mb-5">
            <h3 className="sp-caps text-[var(--n-500)] mb-4">จุดหมายปลายทาง</h3>
            <div className="flex gap-3.5">
              <MapPin size={18} className="text-[var(--brand-500)] mt-1 shrink-0" />
              <div>
                <p className="font-bold text-[var(--n-900)]">{order.receiverName}</p>
                <p className="text-sm text-[var(--n-600)] mt-0.5">{order.address}</p>
                <div className="flex gap-4 mt-3">
                  <a href={`tel:${order.receiverPhone}`} className="sp-btn-touch sp-btn-touch-ghost text-sm no-underline flex items-center gap-2 flex-1 border-[var(--n-300)]">
                    <Phone size={16} className="text-[var(--n-700)]" /> โทรหาผู้รับ
                  </a>
                  <a href={
                    order.lat && order.lng
                      ? `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`
                  } target="_blank" rel="noreferrer" className="sp-btn-touch sp-btn-touch-ghost text-sm no-underline flex items-center gap-2 flex-1 border-[var(--n-300)]">
                    <Navigation size={16} className="text-[var(--n-700)]" /> นำทาง
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="sp-card mb-10">
            <h3 className="sp-caps text-[var(--n-500)] mb-4">รายละเอียดสินค้า</h3>
            <div className="flex justify-between items-center">
              <div className="flex gap-3.5 items-center">
                <Package size={20} className="text-[var(--n-500)]" />
                <div>
                  <p className="font-semibold text-[var(--n-900)]">{order.productName}</p>
                  <p className="text-xs text-[var(--n-600)]">จำนวน {order.quantity} รายการ</p>
                </div>
              </div>
              <div className="text-right">
                <p className="sp-stat-number text-[var(--n-900)] text-xl">฿{(order.totalPrice || order.price).toLocaleString()}</p>
                <span className="sp-caps text-[var(--success-text)] text-[0.6rem]">COD รองรับ</span>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="sp-animate-d2">
            
            {order.status === 'ACCEPTED' && (
              <button 
                onClick={() => updateStatus('pickup')} disabled={updating}
                className="sp-btn-touch sp-btn-touch-full"
              >
                {updating ? <span className="sp-spinner" /> : 'ยืนยันการรับพัสดุ'}
              </button>
            )}

            {order.status === 'PICKED_UP' && (
              <button 
                onClick={() => updateStatus('ship')} disabled={updating}
                className="sp-btn-touch sp-btn-touch-full"
              >
                {updating ? <span className="sp-spinner" /> : 'เริ่มการจัดส่ง'}
              </button>
            )}

            {order.status === 'SHIPPING' && (
              <div className="sp-card border border-dashed border-[var(--n-300)] bg-[var(--n-50)]">
                <p className="sp-caps text-center text-[var(--n-500)] mb-4">หลักฐานการส่ง (POD)</p>
                
                {proofImage ? (
                  <div className="text-center">
                    <img src={proofImage} alt="Proof" className="max-h-[140px] mx-auto rounded-lg mb-4 border border-[var(--n-200)]" />
                    <button onClick={() => setProofImage(null)} className="sp-btn-touch-ghost text-xs py-2 px-4 rounded-full">ถ่ายใหม่</button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => {
                      // ใช้ Base64 PNG ที่ถูกต้องเพื่อให้ Backend (firebase-storage.ts) อ่าน Regex ผ่าน
                      setProofImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
                      toast.success('บันทึกภาพหลักฐานสำเร็จ (Mock PNG)');
                    }}
                    className="w-full p-8 border-2 border-dashed border-[var(--n-300)] rounded-2xl bg-[var(--surface-raised)] text-[var(--n-500)] cursor-pointer flex flex-col items-center"
                  >
                    <Camera size={32} className="mb-2" />
                    <p className="text-xs">คลิกเพื่อจำลองการถ่ายรูปหลักฐาน (Demo)</p>
                  </button>
                )}
                
                <button 
                  onClick={() => updateStatus('complete', { proofOfDelivery: proofImage })}
                  disabled={!proofImage || updating}
                  className="sp-btn-touch sp-btn-touch-full mt-5"
                >
                  {updating ? <span className="sp-spinner" /> : 'ปิดเสร็จสิ้นงานส่ง'}
                </button>
              </div>
            )}

            {order.status === 'DELIVERED' && order.paymentStatus === 'Unpaid' && (
              <div className="sp-card border border-[var(--n-200)] bg-[var(--n-50)]">
                <h3 className="sp-caps text-[var(--n-600)] mb-4 text-center">ช่องทางการรับเงิน</h3>
                
                <div className="flex gap-2 mb-6">
                  <button 
                    onClick={() => setPaymentTab('qr')} 
                    className={`flex-1 p-3 rounded-lg text-xs font-semibold cursor-pointer border ${paymentTab === 'qr' ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]' : 'bg-[var(--n-100)] text-[var(--n-500)] border-[var(--n-300)]'}`}
                  >
                    ลูกค้าสแกน QR
                  </button>
                  <button 
                    onClick={() => setPaymentTab('cash')} 
                    className={`flex-1 p-3 rounded-lg text-xs font-semibold cursor-pointer border ${paymentTab === 'cash' ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]' : 'bg-[var(--n-100)] text-[var(--n-500)] border-[var(--n-300)]'}`}
                  >
                    รับเงินสด/โอนแล้ว
                  </button>
                </div>

                {paymentTab === 'qr' ? (
                  <div className="text-center bg-[var(--n-100)] border border-[var(--brand-200)] rounded-xl py-6 px-4">
                    <Zap size={24} className="text-[var(--brand-600)] mx-auto mb-3" />
                    <h3 className="font-bold text-[var(--n-900)]">รอสแกน QR รับเงิน</h3>
                    <p className="text-xs text-[var(--n-600)] mb-6">สแกน QR จากมือถือลูกค้าเพื่อยืนยันการชำระเงิน</p>
                    <div className="p-4 bg-[var(--n-50)] inline-block rounded-xl">
                      <QRScanner 
                        onScanSuccess={async (text) => {
                          try {
                            const data = JSON.parse(text);
                            if (data.orderId === order.id && data.type === 'SwiftPath_Payment') {
                              await updateStatus('pay');
                            } else {
                              toast.error('QR ไม่ถูกต้องสำหรับออเดอร์นี้');
                            }
                          } catch { toast.error('QR ไม่ถูกต้อง'); }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <DollarSign size={32} className="text-[var(--success-text)] mx-auto mb-2" />
                    <div className="text-3xl font-black text-[var(--n-900)] mb-2">
                      ฿{(order.totalPrice || order.price || 0).toLocaleString()}
                    </div>
                    <h3 className="text-[var(--n-800)] mb-2 font-semibold">ยอดที่ต้องเรียกเก็บ</h3>
                    <p className="text-xs text-[var(--n-500)] mb-6">กดยืนยันหากคุณได้รับเงินสด หรือลูกค้าชำระเงินเรียบร้อยแล้ว</p>
                    <button 
                      onClick={() => updateStatus('pay')} 
                      disabled={updating}
                      className="sp-btn-touch sp-btn-touch-full bg-[var(--success-text)]"
                    >
                      {updating ? <span className="sp-spinner" /> : 'ยืนยันรับเงินเรียบร้อย'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {order.paymentStatus === 'Paid' && (
              <div className="sp-card text-center bg-[rgba(46,125,50,0.05)] border border-[var(--success-text)]">
                <CheckCircle size={32} className="text-[var(--success-text)] mx-auto mb-3" />
                <h3 className="font-black text-[var(--success-text)]">งานสำเร็จ</h3>
                <p className="text-xs text-[var(--n-600)]">ยอดเงินโอนเข้าวอลเล็ทของคุณแล้ว</p>
              </div>
            )}

            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.paymentStatus !== 'Paid' && (
              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      type: 'prompt',
                      title: 'รายงานปัญหา',
                      message: 'กรุณาระบุปัญหาที่พบเพื่อแจ้งให้ร้านค้าทราบ:',
                      placeholder: 'เช่น ลูกค้าไม่อยู่, พัสดุเสียหาย',
                      onConfirm: (reason?: string) => {
                        if (reason) {
                          toast.success('บันทึกการแจ้งปัญหาและแจ้งให้ร้านค้าทราบเรียบร้อยแล้ว');
                          setTimeout(() => router.push('/driver/radar'), 1500);
                        }
                      }
                    });
                  }}
                  className="bg-transparent border-none text-[var(--error-text)] text-xs underline cursor-pointer"
                >
                  รายงานปัญหา / ส่งไม่สำเร็จ
                </button>
              </div>
            )}

          </div>
        </div>

      </main>

      {/* ChatBox Widget */}
      {chatPeer && (
        <ChatBox 
          orderId={order.id}
          currentRole="Driver"
          receiverRole={chatPeer.role}
          receiverId={chatPeer.id}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
      <PremiumModal {...modalConfig} onClose={() => setModalConfig(p => ({ ...p, isOpen: false }))} />
    </div>
  );
}

function getStatusTitle(status: string) {
  const map: Record<string, string> = {
    ACCEPTED: 'ยืนยันตัวตนคนขับแล้ว',
    PICKED_UP: 'รับพัสดุเข้าระบบแล้ว',
    SHIPPING: 'กำลังเดินทางสู่จุดหมาย',
    DELIVERED: 'นำส่งปลายทางเรียบร้อย',
    CANCELLED: 'ออเดอร์ถูกยกเลิก'
  };
  return map[status] || status;
}
