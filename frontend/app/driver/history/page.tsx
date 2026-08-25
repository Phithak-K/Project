'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, CheckCircle, MapPin } from 'lucide-react';

export default function DriverHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<{ stats: any; orders: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    if (!role || role !== 'Driver') { router.push('/login'); return; }
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/proxy/orders/driver/history?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [router, startDate, endDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const setQuick = (mode: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (mode === 'all') { setStartDate(''); setEndDate(''); return; }
    if (mode === 'today') { setStartDate(fmt(today)); setEndDate(fmt(today)); return; }
    if (mode === 'month') {
      setStartDate(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEndDate(fmt(today)); return;
    }
    const from = new Date(); from.setDate(today.getDate() - 7);
    setStartDate(fmt(from)); setEndDate(fmt(today));
  };

  if (isLoading) return (
    <div className="sp-page-loading" style={{ background: 'var(--n-900)' }}>
      <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
    </div>
  );

  const orders = data?.orders ?? [];
  const stats = data?.stats;

  return (
    <div className="sp-page-dark">
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push('/driver')}
            style={{ background: 'none', border: 'none', color: 'var(--n-500)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
            aria-label="????????">
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--n-200)', letterSpacing: '0.04em' }}>
            ????????????????
          </span>
        </div>
      </nav>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* KPI Stats — Industrial Row */}
        <div className="sp-kpi-row">
          <div>
            <div className="sp-stat-number">{stats?.totalDelivered ?? 0}</div>
            <div className="sp-stat-label">????????????</div>
          </div>
          <div>
            <div className="sp-stat-number amber">?{Number(stats?.totalCashCollected ?? 0).toLocaleString()}</div>
            <div className="sp-stat-label">??? COD ?????</div>
          </div>
        </div>

        {/* Date Filters */}
        <div style={{ marginBottom: '2rem' }}>
          <p className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '0.75rem' }}>?????????????????</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {(['today', 'week', 'month', 'all'] as const).map((mode) => (
              <button key={mode} onClick={() => setQuick(mode)}
                style={{ padding: '0.35rem 0.875rem', background: 'transparent', border: '1px solid var(--n-700)', borderRadius: '4px', color: 'var(--n-400)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}>
                {mode === 'today' ? '??????' : mode === 'week' ? '7 ???' : mode === 'month' ? '????????' : '???????'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[{ label: '???????', value: startDate, fn: setStartDate }, { label: '???', value: endDate, fn: setEndDate }].map(({ label, value, fn }) => (
              <div key={label} style={{ flex: 1 }}>
                <label className="sp-caps" style={{ display: 'block', color: 'var(--n-600)', marginBottom: '0.25rem', fontSize: '0.58rem' }}>{label}</label>
                <input type="date" value={value} onChange={(e) => fn(e.target.value)}
                  style={{ width: '100%', background: 'var(--n-850)', border: '1px solid var(--n-800)', borderRadius: '4px', padding: '0.5rem 0.75rem', color: 'var(--n-200)', fontSize: '0.8rem', colorScheme: 'dark', cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Order History List */}
        <hr className="sp-section-divider" />
        <p className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1rem' }}>
          {orders.length > 0 ? `${orders.length} ??????` : '???????????'}
        </p>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--n-700)' }}>
            <Package size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p className="sp-caps" style={{ fontSize: '0.65rem' }}>????????????????????????????</p>
          </div>
        ) : (
          <div>
            {orders.map((order) => (
              <div key={order.id} className="sp-animate"
                style={{ padding: '1.125rem 0', borderBottom: '1px solid var(--n-850)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                    <CheckCircle size={12} style={{ color: 'var(--brand-500)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--brand-500)', fontWeight: 700 }}>{order.trackingNumber}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--n-700)', marginLeft: 'auto' }}>
                      {new Date(order.updatedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--n-200)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{order.receiverName}</p>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                    <MapPin size={11} style={{ color: 'var(--n-700)', marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ color: 'var(--n-600)', fontSize: '0.78rem', lineHeight: 1.4 }}>{order.address}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--n-50)', fontVariantNumeric: 'tabular-nums' }}>
                    ?{Number(order.totalPrice ?? order.price ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '0.25rem', color: (order.paymentMethod === 'COD' || order.paymentStatus === 'Unpaid') ? 'oklch(73% 0.19 50)' : 'var(--n-600)' }}>
                    {(order.paymentMethod === 'COD' || order.paymentStatus === 'Unpaid') ? 'COD ?????' : '????????'}
                  </div>
                  {order.proofOfDelivery && (
                    <img src={order.proofOfDelivery.startsWith('http') || order.proofOfDelivery.startsWith('data:') ? order.proofOfDelivery : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${order.proofOfDelivery.startsWith('/') ? '' : '/'}${order.proofOfDelivery}`}
                      alt="POD" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--n-800)', marginTop: '0.5rem' }}
                      crossOrigin="anonymous" />
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
