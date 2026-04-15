'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Package, MapPin, Truck, CheckCircle, Camera, MessageSquare, 
  ArrowLeft, Phone, DollarSign, Shield, Zap, Navigation
} from 'lucide-react';
import QRScanner from '@/components/QRScanner';

export default function DriverOrderWorkflowPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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

  useEffect(() => {
    fetchOrder();
    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    newSocket.emit('join_order', { orderId: Number(orderId) });
    newSocket.on('order_status_update', () => fetchOrder());
    return () => { newSocket.disconnect(); };
  }, [API_URL, orderId, fetchOrder]);

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
        alert(err.message || 'Error updating status');
      }
    } catch { alert('Network error'); }
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

  if (loading) return <div className="sp-page-loading" style={{ background: 'var(--n-900)' }}><span className="sp-spinner sp-spinner-lg" /></div>;
  if (!order) return null;

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
                      }
                    } catch { alert('QR ไม่ถูกต้อง'); }
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
