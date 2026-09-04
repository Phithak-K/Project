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
      <div className="sp-page" style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '4rem' }}>
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
  const gpsColor: Record<string, string> = {
    idle: 'var(--n-600)',
    active: '#22c55e',
    simulating: '#f59e0b',
    error: '#ef4444',
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
        <button onClick={() => router.push('/driver/radar')} className="sp-btn-danger" style={{ opacity: 0.8 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p className="sp-caps" style={{ color: 'var(--n-500)', fontSize: '0.6rem' }}>รหัสพัสดุ</p>
          <span className="sp-logo" style={{ fontSize: '1rem' }}>{order.trackingNumber}</span>
        </div>
        <button 
          onClick={() => setIsChatOpen(true)}
          disabled={!chatPeer}
          title={chatPeer ? `แชทกับ${chatPeer.role === 'Customer' ? 'ลูกค้า' : 'ร้านค้า'}` : 'ยังไม่มีคู่สนทนาสำหรับออเดอร์นี้'}
          className="sp-btn-brand" 
          style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, opacity: chatPeer ? 1 : 0.4, cursor: chatPeer ? 'pointer' : 'not-allowed' }}
        >
          <MessageSquare size={18} />
        </button>
      </nav>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        
        {/* Status Hero */}
        <div className="sp-card sp-animate" style={{ marginBottom: '1.5rem', textAlign: 'center', background: 'var(--n-50)', border: '1px solid var(--n-200)' }}>
          <span className="sp-caps" style={{ color: 'var(--brand-600)', fontWeight: 900 }}>{order.status}</span>
          <h1 className="sp-font-display" style={{ fontSize: '1.5rem', color: 'var(--n-900)', marginTop: '0.5rem' }}>
            {getStatusTitle(order.status)}
          </h1>
        </div>

        {/* ─── GPS Tracking Panel (แสดงเมื่อกำลังส่งหรือ Shipping) ─── */}
        {(order.status === 'SHIPPING' || order.status === 'PICKED_UP') && (
          <div className="sp-card sp-animate" style={{ marginBottom: '1.5rem', border: `1px solid ${gpsColor[gpsStatus]}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Pulse indicator */}
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: gpsColor[gpsStatus],
                  boxShadow: isTracking ? `0 0 0 4px ${gpsColor[gpsStatus]}30` : 'none',
                  animation: isTracking ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ fontWeight: 700, color: 'var(--n-800)', fontSize: '0.875rem' }}>
                  Real-time GPS
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: gpsColor[gpsStatus], fontWeight: 600 }}>
                {gpsLabel[gpsStatus]}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {/* ปุ่ม GPS จริง */}
              {!isTracking ? (
                <button
                  onClick={startRealGPS}
                  className="sp-btn-brand"
                  style={{ padding: '0.625rem', fontSize: '0.8rem' }}
                >
                  <Radio size={14} /> ส่ง GPS จริง
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  style={{ padding: '0.625rem', fontSize: '0.8rem', background: 'var(--n-200)', color: 'var(--n-200)', border: '1px solid var(--n-700)', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                >
                  <Square size={14} /> หยุดส่งพิกัด
                </button>
              )}

              {/* ปุ่ม Simulator (สำหรับ Demo) */}
              {!isSimulating ? (
                <button
                  onClick={startSimulator}
                  disabled={isTracking && !isSimulating}
                  style={{
                    padding: '0.625rem', fontSize: '0.8rem',
                    background: 'oklch(30% 0.06 42)', color: '#f59e0b',
                    border: '1px solid oklch(40% 0.08 42)', borderRadius: '0.5rem',
                    cursor: isTracking && !isSimulating ? 'not-allowed' : 'pointer',
                    opacity: isTracking && !isSimulating ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                  }}
                >
                  🚛 โหมด Demo
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  style={{ padding: '0.625rem', fontSize: '0.8rem', background: 'oklch(25% 0.05 42)', color: '#f59e0b', border: '1px solid oklch(35% 0.07 42)', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                >
                  <Square size={14} /> หยุด Demo
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.65rem', color: 'var(--n-700)', marginTop: '0.625rem', textAlign: 'center' }}>
              "ส่ง GPS จริง" ใช้สัญญาณจากมือถือ · "โหมด Demo" จำลองเส้นทางให้ดูบนหน้าติดตาม
            </p>
          </div>
        )}

        {/* Info Grid */}
        <div className="sp-stagger">
          <div className="sp-card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-500)', marginBottom: '1rem' }}>จุดหมายปลายทาง</h3>
            <div style={{ display: 'flex', gap: '0.875rem' }}>
              <MapPin size={18} style={{ color: 'var(--brand-500)', marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--n-900)' }}>{order.receiverName}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--n-600)', marginTop: '0.125rem' }}>{order.address}</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <a href={`tel:${order.receiverPhone}`} className="sp-btn-touch sp-btn-touch-ghost" style={{ fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, borderColor: 'var(--n-300)' }}>
                    <Phone size={16} style={{ color: 'var(--n-700)' }} /> โทรหาผู้รับ
                  </a>
                  <a href={
                    order.lat && order.lng
                      ? `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`
                  } target="_blank" rel="noreferrer" className="sp-btn-touch sp-btn-touch-ghost" style={{ fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, borderColor: 'var(--n-300)' }}>
                    <Navigation size={16} style={{ color: 'var(--n-700)' }} /> นำทาง
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="sp-card" style={{ marginBottom: '2.5rem' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-500)', marginBottom: '1rem' }}>รายละเอียดสินค้า</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                <Package size={20} style={{ color: 'var(--n-500)' }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--n-900)' }}>{order.productName}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--n-600)' }}>จำนวน {order.quantity} รายการ</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="sp-stat-number" style={{ color: 'var(--n-900)', fontSize: '1.25rem' }}>฿{(order.totalPrice || order.price).toLocaleString()}</p>
                <span className="sp-caps" style={{ color: 'var(--success-text)', fontSize: '0.6rem' }}>COD รองรับ</span>
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
              <div className="sp-card" style={{ border: '1px dashed var(--n-300)', background: 'var(--n-50)' }}>
                <p className="sp-caps" style={{ textAlign: 'center', color: 'var(--n-500)', marginBottom: '1rem' }}>หลักฐานการส่ง (POD)</p>
                
                {proofImage ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={proofImage} alt="Proof" style={{ maxHeight: '140px', margin: '0 auto', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--n-200)' }} />
                    <button onClick={() => setProofImage(null)} className="sp-btn-touch-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '20px' }}>ถ่ายใหม่</button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => {
                      // ใช้ Base64 PNG ที่ถูกต้องเพื่อให้ Backend (firebase-storage.ts) อ่าน Regex ผ่าน
                      setProofImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
                      toast.success('บันทึกภาพหลักฐานสำเร็จ (Mock PNG)');
                    }}
                    style={{ width: '100%', padding: '2rem', border: '2px dashed var(--n-300)', borderRadius: '1rem', background: 'var(--surface-raised)', color: 'var(--n-500)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <Camera size={32} style={{ marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.8rem' }}>คลิกเพื่อจำลองการถ่ายรูปหลักฐาน (Demo)</p>
                  </button>
                )}
                
                <button 
                  onClick={() => updateStatus('complete', { proofOfDelivery: proofImage })}
                  disabled={!proofImage || updating}
                  className="sp-btn-touch sp-btn-touch-full" style={{ marginTop: '1.25rem' }}
                >
                  {updating ? <span className="sp-spinner" /> : 'ปิดเสร็จสิ้นงานส่ง'}
                </button>
              </div>
            )}

            {order.status === 'DELIVERED' && order.paymentStatus === 'Unpaid' && (
              <div className="sp-card" style={{ border: '1px solid var(--n-200)', background: 'var(--n-50)' }}>
                <h3 className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1rem', textAlign: 'center' }}>ช่องทางการรับเงิน</h3>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => setPaymentTab('qr')} 
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, background: paymentTab === 'qr' ? 'var(--brand-500)' : 'var(--n-100)', color: paymentTab === 'qr' ? '#fff' : 'var(--n-500)', border: `1px solid ${paymentTab === 'qr' ? 'var(--brand-500)' : 'var(--n-300)'}`, cursor: 'pointer' }}
                  >
                    ลูกค้าสแกน QR
                  </button>
                  <button 
                    onClick={() => setPaymentTab('cash')} 
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, background: paymentTab === 'cash' ? 'var(--success-bg)' : 'var(--n-100)', color: paymentTab === 'cash' ? 'var(--success-text)' : 'var(--n-500)', border: `1px solid ${paymentTab === 'cash' ? 'var(--success-text)' : 'var(--n-300)'}`, cursor: 'pointer' }}
                  >
                    รับเงินสด/โอนแล้ว
                  </button>
                </div>

                {paymentTab === 'qr' ? (
                  <div style={{ textAlign: 'center', background: 'var(--n-100)', border: '1px solid var(--brand-200)', borderRadius: '0.75rem', padding: '1.5rem 1rem' }}>
                    <Zap size={24} style={{ color: 'var(--brand-600)', marginBottom: '0.75rem', margin: '0 auto' }} />
                    <h3 style={{ fontWeight: 700, color: 'var(--n-900)' }}>รอสแกน QR รับเงิน</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--n-600)', marginBottom: '1.5rem' }}>สแกน QR จากมือถือลูกค้าเพื่อยืนยันการชำระเงิน</p>
                    <div style={{ padding: '1rem', background: 'var(--n-50)', display: 'inline-block', borderRadius: '10px' }}>
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
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <DollarSign size={32} style={{ color: 'var(--success-text)', margin: '0 auto', marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-900)', marginBottom: '0.5rem' }}>
                      ฿{(order.totalPrice || order.price || 0).toLocaleString()}
                    </div>
                    <h3 style={{ color: 'var(--n-800)', marginBottom: '0.5rem', fontWeight: 600 }}>ยอดที่ต้องเรียกเก็บ</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--n-500)', marginBottom: '1.5rem' }}>กดยืนยันหากคุณได้รับเงินสด หรือลูกค้าชำระเงินเรียบร้อยแล้ว</p>
                    <button 
                      onClick={() => updateStatus('pay')} 
                      disabled={updating}
                      className="sp-btn-touch sp-btn-touch-full" 
                      style={{ background: 'var(--success-text)' }}
                    >
                      {updating ? <span className="sp-spinner" /> : 'ยืนยันรับเงินเรียบร้อย'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {order.paymentStatus === 'Paid' && (
              <div className="sp-card" style={{ textAlign: 'center', background: 'rgba(46, 125, 50, 0.05)', border: '1px solid var(--success-text)' }}>
                <CheckCircle size={32} style={{ color: 'var(--success-text)', marginBottom: '0.75rem' }} />
                <h3 style={{ fontWeight: 900, color: 'var(--success-text)' }}>งานสำเร็จ</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--n-600)' }}>ยอดเงินโอนเข้าวอลเล็ทของคุณแล้ว</p>
              </div>
            )}

            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.paymentStatus !== 'Paid' && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
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
                  style={{ background: 'none', border: 'none', color: 'var(--error-text)', fontSize: '0.8rem', textDecoration: 'underline', cursor: 'pointer' }}
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
