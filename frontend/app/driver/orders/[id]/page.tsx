'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Package, MapPin, Truck, CheckCircle, Camera, MessageSquare, 
  ArrowLeft, Phone, DollarSign, Shield, Zap, Navigation, Radio, Square
} from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { toast } from 'react-hot-toast';
import OrderSkeleton from '@/components/OrderSkeleton';

export default function DriverOrderWorkflowPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // ─── Real-time GPS State ────────────────────────────────────────────────────
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'active' | 'simulating' | 'error'>('idle');
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simulatorRef = useRef<NodeJS.Timeout | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const orderId = params.id;

  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchOrder = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { router.push('/login'); return; }
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrder(await res.json());
      else        router.push('/driver/radar');
    } catch { console.error('Error fetching order'); }
    finally { setLoading(false); }
  }, [API_URL, orderId, router]);

  // ─── เชื่อมต่อ Socket.io เมื่อโหลดหน้า ──────────────────────────────────────
  useEffect(() => {
    fetchOrder();
    const token = getAuthToken();
    if (!token) return;

    const socket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    socketRef.current = socket;
    socket.emit('join_order', { orderId: Number(orderId) });
    socket.on('order_status_update', () => fetchOrder());

    return () => {
      stopTracking();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [API_URL, orderId, fetchOrder]);

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
        console.error('GPS Error:', err);
        toast.error('ไม่สามารถเข้าถึง GPS ได้: ' + err.message);
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
    const token = getAuthToken();
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(extraBody)
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || 'Error updating status');
      } else {
        toast.success('อัปเดตสถานะสำเร็จ');
      }
    } catch { toast.error('Network error'); }
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
      <div className="sp-page-dark" style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '4rem' }}>
          <OrderSkeleton dark />
          <OrderSkeleton dark />
        </div>
      </div>
    );
  }
  if (!order) return null;

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
    <div className="sp-page-dark">
      <nav className="sp-nav-dark">
        <button onClick={() => router.push('/driver/radar')} className="sp-btn-danger" style={{ opacity: 0.6 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p className="sp-caps" style={{ color: 'var(--n-600)', fontSize: '0.6rem' }}>รหัสพัสดุ</p>
          <span className="sp-logo-dark" style={{ fontSize: '1rem' }}>{order.trackingNumber}</span>
        </div>
        <button className="sp-btn-brand" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}>
          <MessageSquare size={18} />
        </button>
      </nav>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        
        {/* Status Hero */}
        <div className="sp-card-dark sp-animate" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <span className="sp-caps" style={{ color: 'oklch(62% 0.2 42)', fontWeight: 900 }}>{order.status}</span>
          <h1 className="sp-font-display" style={{ fontSize: '1.5rem', color: 'var(--n-50)', marginTop: '0.5rem' }}>
            {getStatusTitle(order.status)}
          </h1>
        </div>

        {/* ─── GPS Tracking Panel (แสดงเมื่อกำลังส่งหรือ Shipping) ─── */}
        {(order.status === 'SHIPPING' || order.status === 'PICKED_UP') && (
          <div className="sp-card-dark sp-animate" style={{ marginBottom: '1.5rem', border: `1px solid ${gpsColor[gpsStatus]}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Pulse indicator */}
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: gpsColor[gpsStatus],
                  boxShadow: isTracking ? `0 0 0 4px ${gpsColor[gpsStatus]}30` : 'none',
                  animation: isTracking ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ fontWeight: 700, color: 'var(--n-100)', fontSize: '0.875rem' }}>
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
                  style={{ padding: '0.625rem', fontSize: '0.8rem', background: 'var(--n-800)', color: 'var(--n-200)', border: '1px solid var(--n-700)', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
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
          <div className="sp-card-dark" style={{ marginBottom: '1.25rem' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1rem' }}>จุดหมายปลายทาง</h3>
            <div style={{ display: 'flex', gap: '0.875rem' }}>
              <MapPin size={18} style={{ color: 'var(--brand-500)', marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--n-100)' }}>{order.receiverName}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--n-500)', marginTop: '0.125rem' }}>{order.address}</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <button className="sp-btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--n-200)', borderColor: 'var(--n-700)' }}>
                    <Phone size={14} /> โทรหาผู้รับ
                  </button>
                  <button className="sp-btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--n-200)', borderColor: 'var(--n-700)' }}>
                    <Navigation size={14} /> นำทาง
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="sp-card-dark" style={{ marginBottom: '2.5rem' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1rem' }}>รายละเอียดสินค้า</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                <Package size={20} style={{ color: 'var(--n-700)' }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--n-100)' }}>{order.productName}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--n-500)' }}>จำนวน {order.quantity} รายการ</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="sp-stat-number" style={{ color: 'var(--n-50)', fontSize: '1.25rem' }}>฿{(order.totalPrice || order.price).toLocaleString()}</p>
                <span className="sp-caps" style={{ color: 'var(--success-text)', fontSize: '0.6rem' }}>COD รองรับ</span>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="sp-animate-d2">
            
            {order.status === 'ACCEPTED' && (
              <button 
                onClick={() => updateStatus('pickup')} disabled={updating}
                className="sp-btn-brand sp-btn-full" style={{ padding: '1.125rem' }}
              >
                {updating ? <span className="sp-spinner" /> : 'ยืนยันการรับพัสดุ'}
              </button>
            )}

            {order.status === 'PICKED_UP' && (
              <button 
                onClick={() => updateStatus('ship')} disabled={updating}
                className="sp-btn-brand sp-btn-full" style={{ padding: '1.125rem' }}
              >
                {updating ? <span className="sp-spinner" /> : 'เริ่มการจัดส่ง'}
              </button>
            )}

            {order.status === 'SHIPPING' && (
              <div className="sp-card-dark" style={{ border: '1px dashed var(--n-700)' }}>
                <p className="sp-caps" style={{ textAlign: 'center', color: 'var(--n-600)', marginBottom: '1rem' }}>หลักฐานการส่ง (POD)</p>
                <label style={{ display: 'block', padding: '2rem', border: '2px dashed var(--n-800)', borderRadius: '1rem', textAlign: 'center', cursor: 'pointer' }}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {proofImage ? (
                    <img src={proofImage} alt="Proof" style={{ maxHeight: '140px', margin: '0 auto', borderRadius: '0.5rem' }} />
                  ) : (
                    <div style={{ color: 'var(--n-600)' }}>
                      <Camera size={32} style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.8rem' }}>ถ่ายรูปพัสดุตอนถึงมือลูกค้า</p>
                    </div>
                  )}
                </label>
                <button 
                  onClick={() => updateStatus('complete', { proofOfDelivery: proofImage })}
                  disabled={!proofImage || updating}
                  className="sp-btn-brand sp-btn-full" style={{ marginTop: '1.25rem', padding: '1.125rem' }}
                >
                  {updating ? <span className="sp-spinner" /> : 'ปิดเสร็จสิ้นงานส่ง'}
                </button>
              </div>
            )}

            {order.status === 'DELIVERED' && order.paymentStatus === 'Unpaid' && (
              <div className="sp-card-dark" style={{ textAlign: 'center', background: 'var(--brand-900)', border: '1px solid var(--brand-600)' }}>
                <Zap size={24} style={{ color: 'var(--brand-500)', marginBottom: '0.75rem' }} />
                <h3 style={{ fontWeight: 700, color: 'var(--n-50)' }}>รอสแกน QR รับเงิน</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--n-500)', marginBottom: '1.5rem' }}>สแกน QR จากมือถือลูกค้าเพื่อยืนยันการชำระเงิน</p>
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
            )}

            {order.paymentStatus === 'Paid' && (
              <div className="sp-card-dark" style={{ textAlign: 'center', background: 'oklch(18% 0.014 38 / 0.5)', border: '1px solid var(--success-text)' }}>
                <CheckCircle size={32} style={{ color: 'var(--success-text)', marginBottom: '0.75rem' }} />
                <h3 style={{ fontWeight: 900, color: 'var(--n-50)' }}>งานสำเร็จ</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--n-500)' }}>ยอดเงินโอนเข้าวอลเล็ทของคุณแล้ว</p>
              </div>
            )}

          </div>
        </div>

      </main>
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
