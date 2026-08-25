'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Clock, ArrowLeft, CheckCircle2, Banknote } from 'lucide-react';

export default function DriverHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDelivered: 0, totalCashCollected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/proxy/orders/driver/history');
        if (res.ok) {
          const data = await res.json();
          // Backend returns { stats: { totalDelivered, totalCashCollected }, orders: [...] }
          setHistory(data.orders || []);
          setStats(data.stats || { totalDelivered: 0, totalCashCollected: 0 });
        } else {
          setError('ไม่สามารถโหลดประวัติได้');
        }
      } catch {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (isLoading) return (
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--n-200)', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p className="sp-caps" style={{ color: 'var(--n-500)', marginTop: '1rem' }}>Loading History</p>
      </div>
    </div>
  );

  return (
    <div className="sp-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="sp-nav">
        <Link href="/driver" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--n-600)', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>
          <ArrowLeft size={16} /> กลับหน้าหลัก
        </Link>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', width: '100%', flex: 1 }}>
        <div className="sp-animate-d1" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-600)' }}>YOUR ACTIVITY</span>
          <h1 className="sp-font-display" style={{ fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1, marginTop: '0.5rem', letterSpacing: '-0.02em', color: 'var(--n-900)' }}>
            ประวัติการส่งของ
          </h1>
        </div>

        {/* KPI Stats */}
        <div className="sp-animate-d1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
          <div className="sp-card" style={{ padding: '1.5rem', border: '1px solid var(--n-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--n-600)', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span className="sp-caps">งานที่ส่งสำเร็จ</span>
            </div>
            <p className="sp-font-display" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--n-900)' }}>
              {stats.totalDelivered} <span style={{ fontSize: '1rem', color: 'var(--n-500)', fontWeight: 600 }}>งาน</span>
            </p>
          </div>
          <div className="sp-card" style={{ padding: '1.5rem', background: 'var(--brand-50)', border: '1px solid var(--brand-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-700)', marginBottom: '0.5rem' }}>
              <Banknote size={16} />
              <span className="sp-caps">ยอดเงินสด (COD) รวม</span>
            </div>
            <p className="sp-font-display" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-800)' }}>
              ฿{stats.totalCashCollected.toLocaleString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="sp-animate" style={{ padding: '1rem', borderLeft: '4px solid var(--error-text)', background: 'var(--error-bg)', color: 'var(--error-text)', marginBottom: '2rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {history.length === 0 ? (
          <div className="sp-animate-d2 sp-card" style={{ padding: '4rem 0', textAlign: 'center', background: 'var(--n-50)' }}>
            <Clock size={32} style={{ color: 'var(--n-500)', margin: '0 auto 1rem' }} />
            <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ยังไม่มีประวัติการส่ง</p>
          </div>
        ) : (
          <div className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map(order => (
              <div key={order.id} className="sp-card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', border: '1px solid var(--n-200)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'var(--brand-50)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)', flexShrink: 0 }}>
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="sp-mono" style={{ fontWeight: 700, color: 'var(--brand-600)', fontSize: '0.85rem' }}>{order.trackingNumber}</p>
                    <p style={{ color: 'var(--n-900)', fontSize: '1.1rem', marginTop: '0.125rem', fontWeight: 700 }}>{order.productName}</p>
                    <p style={{ color: 'var(--n-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      ผู้รับ: {order.receiverName} ({order.receiverPhone})
                    </p>
                    <p style={{ color: 'var(--n-500)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                      ส่งเมื่อ: {new Date(order.updatedAt).toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <p className="sp-font-display" style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--n-900)' }}>
                    ฿{(order.totalPrice || order.price)?.toLocaleString()}
                  </p>
                  <p className="sp-caps" style={{ color: 'var(--success-text)', fontSize: '0.75rem', background: 'rgba(46, 125, 50, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    ส่งสำเร็จ
                  </p>
                  {order.proofOfDelivery && (
                    <img 
                      src={order.proofOfDelivery} 
                      alt="POD" 
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--n-200)', marginTop: '0.5rem' }} 
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
