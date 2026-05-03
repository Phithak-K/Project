'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, DollarSign, 
  MessageSquare, Shield, AlertCircle, ChevronRight, User
} from 'lucide-react';

const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'SHIPPING', 'DELIVERED'];

export default function MerchantOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setOrder(await res.json());
      else        router.push('/merchant');
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

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> กลับไปยังแดชบอร์ด
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ width: '120px' }} />
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        <div className="sp-animate" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span className="sp-section-eyebrow">รายละเอียดออเดอร์</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>{order.trackingNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              สร้างเมื่อ {new Date(order.createdAt).toLocaleString('th-TH')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="sp-btn-ghost"><MessageSquare size={16} /> แชทกับคนขับ</button>
            <button className="sp-btn-danger" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>ยกเลิกออเดอร์</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          
          <div className="sp-stagger">
            {/* Timeline Row */}
            <div className="sp-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1.5rem' }}>สถานะการขนส่ง</h3>
              <div className="sp-timeline" style={{ paddingLeft: '0.5rem' }}>
                {STATUS_FLOW.map((status, index) => {
                  const isDone = index <= currentStepIndex;
                  const isNow = index === currentStepIndex;
                  return (
                    <div key={status} className="sp-timeline-item" style={{ marginBottom: '1.5rem', opacity: isDone ? 1 : 0.4 }}>
                      <div className={`sp-timeline-dot ${isNow ? 'sp-timeline-dot-active' : ''}`} style={{ background: isDone ? 'var(--brand-500)' : 'var(--n-200)' }} />
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--n-900)', fontSize: '0.95rem' }}><StatusLabel status={status} /></p>
                        {isNow && <p style={{ fontSize: '0.75rem', color: 'var(--brand-600)', marginTop: '0.1rem' }}>กำลังดำเนินการในขั้นตอนนี้</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details Table */}
            <div className="sp-card">
              <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1.25rem' }}>ข้อมูลการจัดส่ง</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <User size={18} style={{ color: 'var(--n-300)', marginTop: '0.125rem' }} />
                  <div>
                    <p className="sp-caps" style={{ color: 'var(--n-400)', fontSize: '0.7rem' }}>ผู้รับ</p>
                    <p style={{ fontWeight: 700 }}>{order.receiverName}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--n-600)' }}>{order.receiverPhone}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <MapPin size={18} style={{ color: 'var(--n-300)', marginTop: '0.125rem' }} />
                  <div>
                    <p className="sp-caps" style={{ color: 'var(--n-400)', fontSize: '0.7rem' }}>ที่อยู่</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--n-700)', lineHeight: 1.5 }}>{order.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="sp-stagger" style={{ animationDelay: '100ms' }}>
            {/* Price Card */}
            <div className="sp-card-dark" style={{ marginBottom: '1.5rem' }}>
              <h3 className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1.25rem' }}>สรุปยอดชำระ</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--n-500)' }}>ยอดสินค้า</span>
                  <span style={{ color: 'var(--n-50)' }}>฿{(order.price || 0).toLocaleString()}</span>
                </div>
                {order.hasInsurance && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'oklch(65% 0.12 270)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Shield size={14} /> ประกันสินค้า
                    </span>
                    <span style={{ color: 'var(--n-50)' }}>+ ฿50</span>
                  </div>
                )}
                <div style={{ height: '1px', background: 'var(--n-800)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="sp-caps" style={{ color: 'var(--n-500)' }}>รวมสุทธิ</span>
                  <span className="sp-stat-number" style={{ fontSize: '2rem', color: 'var(--n-50)' }}>
                    ฿{(order.totalPrice || order.price).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver Card */}
            {order.driver ? (
              <div className="sp-card">
                <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1.25rem' }}>คนขับที่รับงาน</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--n-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-400)' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700 }}>{order.driver.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--n-400)' }}>{order.driver.vehiclePlate || 'ทะเบียน xxxx'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sp-card" style={{ border: '1px dashed var(--n-200)', background: 'var(--n-50)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Clock size={20} className="sp-spinner" style={{ color: 'var(--brand-500)' }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--n-500)' }}>กำลังจับคู่คนขับ</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--n-400)' }}>โปรดรอสักครู่ ระบบกำลังกระจายงาน</p>
                  </div>
                </div>
              </div>
            )}
          </aside>

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
  const labels: Record<string, string> = {
    PENDING: 'รอระบบส่งงานให้คนขับ', ACCEPTED: 'คนขับยอมรับงานแล้ว', PICKED_UP: 'พัสดุถูกรับโดยคนขับ',
    SHIPPING: 'พัสดุอยู่ในระหว่างการจัดส่ง', DELIVERED: 'พัสดุถึงมือผู้รับเรียบร้อย',
  };
  return <span>{labels[status] || status}</span>;
}
