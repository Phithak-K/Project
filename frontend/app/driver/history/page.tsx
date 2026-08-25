'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Clock, Shield, ArrowLeft } from 'lucide-react';

export default function DriverHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/proxy/orders/driver/history');
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
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
    <div className="sp-page-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--n-800)', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p className="sp-caps" style={{ color: 'var(--n-500)', marginTop: '1rem' }}>Loading History</p>
      </div>
    </div>
  );

  return (
    <div className="sp-page-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="sp-nav-dark">
        <Link href="/driver" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--n-400)', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>
          <ArrowLeft size={16} /> กลับหน้าหลัก
        </Link>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', width: '100%', flex: 1 }}>
        <div className="sp-animate-d1" style={{ marginBottom: '3rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>YOUR ACTIVITY</span>
          <h1 className="sp-font-display" style={{ fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1, marginTop: '0.5rem', letterSpacing: '-0.02em', color: 'var(--n-50)' }}>
            ประวัติการส่งของ
          </h1>
        </div>

        {error && (
          <div className="sp-animate" style={{ padding: '1rem', borderLeft: '4px solid oklch(73% 0.19 50)', background: 'var(--n-850)', color: 'var(--n-50)', marginBottom: '2rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {history.length === 0 ? (
          <div className="sp-animate-d2" style={{ padding: '4rem 0', textAlign: 'center' }}>
            <Clock size={32} style={{ color: 'var(--n-600)', margin: '0 auto 1rem' }} />
            <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ยังไม่มีประวัติการส่ง</p>
          </div>
        ) : (
          <div className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map(order => (
              <div key={order.id} style={{ background: 'var(--n-850)', borderTop: '2px solid var(--n-800)', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'var(--n-900)', border: '1px solid var(--n-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(65% 0.15 150)' }}>
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="sp-mono" style={{ fontWeight: 700, color: 'var(--n-400)', fontSize: '0.85rem' }}>{order.trackingNumber}</p>
                    <p style={{ color: 'var(--n-50)', fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 700 }}>{order.productName}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="sp-font-display" style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--n-50)' }}>
                    ฿{(order.totalPrice || order.price)?.toLocaleString()}
                  </p>
                  <p className="sp-mono" style={{ color: 'var(--success-text)', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.25rem', textTransform: 'uppercase' }}>
                    SUCCESS
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
