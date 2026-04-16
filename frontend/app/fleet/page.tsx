'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Truck, MapPin, Package, Phone, 
  CheckCircle, Navigation, LogOut, RefreshCw, Clock, Shield, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: number;
  trackingNumber: string;
  productName: string;
  receiverName: string;
  receiverPhone: string;
  address: string;
  totalPrice: number;
  status: string;
  weatherWarning?: string;
  estimatedMinutes?: number;
}

export default function DriverDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchJobs = useCallback(async () => {
    setRefreshing(true);
    const token = getAuthToken();
    if (!token) return window.location.href = '/login';

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/orders/available`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data);
      }
    } catch (error) {
      console.error("Fetch jobs error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleAcceptOrder = async (orderId: number) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setActiveOrder(updatedOrder);
        fetchJobs();
      } else {
        const err = await res.json();
        alert(err.message || 'รับงานไม่สำเร็จ');
      }
    } catch (err) { alert('Network Error'); }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  if (loading) return (
    <div className="sp-page-loading" style={{ background: 'var(--n-900)' }}>
      <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
    </div>
  );

  return (
    <div className="sp-page-dark">
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo-dark">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>Partner Fleet</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/radar">
            <button className="sp-btn-brand" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              <Navigation size={14} /> Open Radar
            </button>
          </Link>
          <button onClick={handleLogout} className="sp-btn-ghost" style={{ color: 'var(--n-600)' }}>
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <header className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>Fleet Operations</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900, color: 'var(--n-50)' }}>
            งานจัดส่งในพื้นที่
          </h1>
          <p style={{ color: 'var(--n-600)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {refreshing ? 'กำลังอัปเดตงาน...' : 'มีงานใหม่ที่พร้อมให้คุณรับ'}
          </p>
        </header>

        <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="sp-section-header">
            <h2 className="sp-section-title" style={{ color: 'var(--n-100)' }}>งานว่างทั้งหมด</h2>
            <button 
              onClick={fetchJobs} 
              disabled={refreshing}
              style={{ background: 'none', border: 'none', color: 'var(--n-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
              className={refreshing ? 'animate-spin' : ''}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {availableOrders.length === 0 ? (
              <div className="sp-card-dark" style={{ textAlign: 'center', borderStyle: 'dashed', padding: '3rem 1rem' }}>
                <p className="sp-caps" style={{ color: 'var(--n-700)' }}>ไม่มีงานใหม่ในขณะนี้</p>
                <p style={{ color: 'var(--n-800)', fontSize: '0.8rem', marginTop: '0.5rem' }}>โปรดลองรีเฟรชหรือเปิดเรดาร์เพื่อหาจุด Surge</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <div key={order.id} className="sp-card-dark sp-animate" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <p className="sp-caps" style={{ color: 'var(--brand-500)', fontSize: '0.75rem', fontWeight: 700 }}>{order.trackingNumber}</p>
                        <h4 style={{ fontWeight: 700, color: 'var(--n-50)', fontSize: '1.1rem', marginTop: '0.125rem' }}>{order.productName}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="sp-font-display" style={{ fontWeight: 900, color: 'var(--n-50)', fontSize: '1.5rem' }}>
                          ฿{order.totalPrice.toLocaleString()}
                        </p>
                        {order.weatherWarning && <span className="sp-caps" style={{ color: 'var(--brand-400)', fontSize: '0.7rem' }}>Surge Protection Active</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                       <span style={{ fontSize: '0.75rem', color: 'var(--n-600)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} /> ETA {order.estimatedMinutes || 20} นาที
                       </span>
                       <span style={{ fontSize: '0.75rem', color: 'var(--n-600)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Shield size={12} /> High Priority
                       </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', marginBottom: '1.5rem' }}>
                       <MapPin size={14} style={{ color: 'var(--n-700)', marginTop: '0.125rem' }} />
                       <div style={{ flex: 1 }}>
                          <p style={{ color: 'var(--n-400)', fontSize: '0.875rem', fontWeight: 600 }}>{order.receiverName}</p>
                          <p style={{ color: 'var(--n-600)', fontSize: '0.8rem', lineHeight: 1.5 }}>{order.address}</p>
                       </div>
                    </div>

                    <button 
                      onClick={() => handleAcceptOrder(order.id)}
                      className="sp-btn-brand sp-btn-full"
                      style={{ padding: '0.875rem' }}
                    >
                      <Truck size={16} /> รับงานนี้ทันที
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sp-divider" style={{ background: 'var(--n-800)' }} />
          <Link href="/dashboard">
             <button className="sp-btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--n-500)' }}>
                ดูสรุปรายได้ของคุณ <ArrowRight size={14} />
             </button>
          </Link>

        </div>
      </main>
    </div>
  );
}