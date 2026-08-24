'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CheckCircle, Calendar, DollarSign, Wallet } from 'lucide-react';

export default function DriverHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<{ stats: any, orders: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchHistory = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') {
      router.push('/login');
      return;
    }
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await fetch(`/api/proxy/orders/driver/history?${queryParams.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (isLoading) {
    return (
      <div className="sp-page-loading" style={{ background: 'var(--n-900)' }}>
        <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="sp-page-dark">
      {/* ── Nav ── */}
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push('/driver')} style={{ background: 'none', border: 'none', color: 'var(--n-300)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>ประวัติงานจัดส่ง</span>
        </div>
      </nav>

      <main className="sp-container" style={{ paddingTop: '2rem' }}>
        
        {/* ── Date Filters ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', background: 'var(--n-800)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--n-700)' }}>
          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--brand-500)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              วันนี้
            </button>
            <button 
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yStr = yesterday.toISOString().split('T')[0];
                setStartDate(yStr);
                setEndDate(yStr);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--n-700)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              เมื่อวาน
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const last7 = new Date();
                last7.setDate(today.getDate() - 7);
                setStartDate(last7.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--n-700)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              7 วันล่าสุด
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--n-700)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              เดือนนี้
            </button>
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }} 
              style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid var(--n-600)', borderRadius: '20px', color: 'var(--n-400)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ล้างค่า
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--n-400)', fontWeight: 600, marginBottom: '0.25rem' }}>เริ่มต้น</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="sp-input" 
                style={{ width: '100%', background: 'var(--n-900)', border: '1px solid var(--n-700)', color: '#fff', padding: '0.5rem', fontSize: '0.8rem', colorScheme: 'dark', cursor: 'pointer' }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--n-400)', fontWeight: 600, marginBottom: '0.25rem' }}>สิ้นสุด</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="sp-input" 
                style={{ width: '100%', background: 'var(--n-900)', border: '1px solid var(--n-700)', color: '#fff', padding: '0.5rem', fontSize: '0.8rem', colorScheme: 'dark', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* ── KPI Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className="sp-card-dark sp-animate">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'oklch(65% 0.18 30 / 0.1)', borderRadius: '8px' }}>
                <Package size={20} style={{ color: 'var(--brand-500)' }} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--n-400)', fontWeight: 600 }}>ส่งสำเร็จแล้ว</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
              {data?.stats?.totalDelivered || 0} <span style={{ fontSize: '1rem', color: 'var(--n-500)', fontWeight: 600 }}>งาน</span>
            </div>
          </div>

          <div className="sp-card-dark sp-animate" style={{ animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'oklch(65% 0.15 150 / 0.1)', borderRadius: '8px' }}>
                <DollarSign size={20} style={{ color: 'oklch(65% 0.15 150)' }} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--n-400)', fontWeight: 600 }}>ยอดเก็บเงินสด COD</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
              <span style={{ fontSize: '1.25rem', color: 'var(--n-400)', marginRight: '0.25rem' }}>฿</span>
              {Number(data?.stats?.totalCashCollected || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── Order History List ── */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: 'var(--brand-500)' }} /> ประวัติย้อนหลัง
        </h2>

        {!data?.orders || data.orders.length === 0 ? (
          <div className="sp-card-dark sp-animate-d1" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Package size={48} style={{ color: 'var(--n-700)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--n-400)', fontSize: '1rem' }}>ยังไม่มีประวัติการส่งงาน</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.orders.map((order, idx) => (
              <div key={order.id} className="sp-card-dark sp-animate" style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s`, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(46, 125, 50, 0.15)', color: 'rgb(46, 125, 50)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <CheckCircle size={12} /> DELIVERED
                    </span>
                    <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>#{order.trackingNumber}</h3>
                    <p style={{ color: 'var(--n-400)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {new Date(order.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                      ฿{Number(order.totalPrice || order.price || 0).toLocaleString()}
                    </div>
                    <div style={{ color: order.paymentMethod === 'COD' || order.paymentStatus === 'Unpaid' ? 'rgb(230, 81, 0)' : 'var(--n-500)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      {order.paymentMethod === 'COD' || order.paymentStatus === 'Unpaid' ? 'รอโอนเงิน (COD)' : 'ชำระล่วงหน้าแล้ว'}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--n-800)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <MapPin size={16} style={{ color: 'var(--brand-500)', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <p style={{ color: 'var(--n-200)', fontSize: '0.875rem', fontWeight: 600 }}>{order.receiverName}</p>
                      <p style={{ color: 'var(--n-500)', fontSize: '0.8rem', marginTop: '0.125rem' }}>{order.address}</p>
                      <p style={{ color: 'var(--brand-600)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>📞 {order.receiverPhone}</p>
                    </div>
                  </div>
                </div>

                {order.proofOfDelivery && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--n-900)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--n-800)' }}>
                    <img 
                      src={
                        order.proofOfDelivery.startsWith('http') || order.proofOfDelivery.startsWith('data:') 
                          ? order.proofOfDelivery 
                          : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${order.proofOfDelivery.startsWith('/') ? '' : '/'}${order.proofOfDelivery}`
                      }
                      alt="Proof" 
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--n-700)' }} 
                      crossOrigin="anonymous"
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--n-300)', fontWeight: 600 }}>หลักฐานการส่งมอบ</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--n-500)' }}>อัปโหลดสำเร็จ</p>
                    </div>
                    <CheckCircle size={16} style={{ color: 'rgb(46, 125, 50)', marginRight: '0.5rem' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
