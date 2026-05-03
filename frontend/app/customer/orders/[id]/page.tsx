'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  ArrowLeft, Package, MapPin, Truck, CheckCircle, Clock, 
  Shield, Star, MessageSquare, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'SHIPPING', 'DELIVERED'];

export default function CustomerOrderTrackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);

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
      else        router.push('/customer');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [API_URL, orderId, router]);

  useEffect(() => {
    fetchOrder();
    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    newSocket.emit('join_order', { orderId: Number(orderId) });
    newSocket.on('order_status_update', () => fetchOrder());
    return () => { newSocket.disconnect(); };
  }, [API_URL, orderId, fetchOrder]);

  const submitRating = async () => {
    if (ratingScore === 0) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: ratingScore, comment: ratingComment })
      });
      if (res.ok) {
        setHasRated(true);
        alert('ขอบคุณสำหรับคะแนนประเมิน!');
      }
    } catch { alert('เกิดข้อผิดพลาด'); }
  };

  if (loading) return <div className="sp-page-loading"><span className="sp-spinner sp-spinner-lg" /></div>;
  if (!order) return null;

  const currentStepIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/customer')} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> กลับไปยังรายการพัสดุ
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ width: '120px' }} />
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* Header Unit */}
        <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">พัสดุของฉัน</span>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>{order.trackingNumber}</h1>
              <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{order.productName}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Timeline unit */}
        <div className="sp-card sp-animate-d1" style={{ marginBottom: '1.5rem' }}>
          <div className="sp-section-header">
            <h3 className="sp-section-title">สถานะการจัดส่ง</h3>
            <span className="sp-caps" style={{ color: 'var(--brand-500)' }}>Live Update</span>
          </div>
          <div className="sp-timeline" style={{ marginTop: '1.5rem' }}>
            {STATUS_FLOW.map((status, idx) => {
              const active = idx <= currentStepIdx;
              const current = idx === currentStepIdx;
              return (
                <div key={status} className="sp-timeline-item" style={{ marginBottom: '1.5rem', opacity: active ? 1 : 0.4 }}>
                  <div className={`sp-timeline-dot ${current ? 'sp-timeline-dot-active' : ''}`} style={{ background: active ? 'var(--brand-500)' : 'var(--n-200)' }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--n-900)', fontSize: '0.95rem' }}><StatusLabel status={status} /></p>
                    {current && <p style={{ fontSize: '0.75rem', color: 'var(--brand-600)', marginTop: '0.1rem' }}>กำลังดำเนินการ</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment QR (if needed) */}
        {order.status === 'DELIVERED' && order.paymentStatus === 'Unpaid' && (
          <div className="sp-card-dark sp-animate" style={{ background: 'var(--brand-500)', border: 'none', textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 className="sp-font-display" style={{ color: 'var(--n-50)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              มียอดชำระ: ฿{(order.totalPrice || order.price).toLocaleString()}
            </h3>
            <p style={{ color: 'oklch(100% 0 0 / 0.8)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              กรุณาให้คนขับสแกน QR Code เพื่อยืนยันการรับสินค้า
            </p>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '1rem', display: 'inline-block' }}>
              <QRCodeSVG value={JSON.stringify({ orderId: order.id, type: 'SwiftPath_Payment' })} size={180} />
            </div>
          </div>
        )}

        {/* Rating unit */}
        {order.paymentStatus === 'Paid' && !hasRated && (
          <div className="sp-card sp-animate" style={{ textAlign: 'center', border: '1.5px solid var(--brand-100)' }}>
            <p className="sp-caps" style={{ color: 'var(--brand-500)', marginBottom: '0.75rem' }}>ประเมินการบริการ</p>
            <h3 className="sp-font-display" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>คุณพอใจการส่งครั้งนี้ไหม?</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRatingScore(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s' }} className="hover:scale-110">
                  <Star size={32} fill={ratingScore >= s ? 'var(--brand-500)' : 'none'} color={ratingScore >= s ? 'var(--brand-500)' : 'var(--n-200)'} />
                </button>
              ))}
            </div>
            {ratingScore > 0 && (
              <div className="sp-animate-d1">
                <input 
                  type="text" value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                  className="sp-input" placeholder="เขียนคำชมเชยหรือข้อเสนอแนะ..."
                  style={{ marginBottom: '0.75rem' }}
                />
                <button onClick={submitRating} className="sp-btn-brand sp-btn-full">ส่งความคิดเห็น</button>
              </div>
            )}
          </div>
        )}

        {/* Details Footer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2.5rem' }}>
          <div>
            <p className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '0.5rem' }}>ผู้ส่ง</p>
            <p style={{ fontWeight: 700 }}>{order.merchant?.storeName || 'Partner Store'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '0.5rem' }}>ค่าบริการรวม</p>
            <p className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 900 }}>฿{(order.totalPrice || order.price).toLocaleString()}</p>
          </div>
        </div>

      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'sp-badge sp-badge-pending', ACCEPTED: 'sp-badge sp-badge-accepted',
    PICKED_UP: 'sp-badge sp-badge-picked', SHIPPING: 'sp-badge sp-badge-shipping',
    DELIVERED: 'sp-badge sp-badge-delivered', CANCELLED: 'sp-badge sp-badge-cancelled',
  };
  const labels: Record<string, string> = {
    PENDING: 'รอยืนยัน', ACCEPTED: 'รับงานแล้ว', PICKED_UP: 'รับพัสดุแล้ว',
    SHIPPING: 'กำลังส่ง', DELIVERED: 'สำเร็จ', CANCELLED: 'ยกเลิก',
  };
  return <span className={map[status] || 'sp-badge sp-badge-pending'}>{labels[status] || status}</span>;
}

function StatusLabel({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'คำสั่งซื้อถูกส่งเข้าระบบ', ACCEPTED: 'คนขับยอมรับงานและกำลังเดินทาง',
    PICKED_UP: 'พัสดุออกจากร้านค้าแล้ว', SHIPPING: 'พัสดุอยู่ใกล้คุณแล้ว',
    DELIVERED: 'พัสดุถึงมือผู้รับเรียบร้อย',
  };
  return map[status] || status;
}
