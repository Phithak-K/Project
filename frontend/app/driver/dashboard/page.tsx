'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Package, CloudRain, TrendingUp, Navigation } from 'lucide-react';

export default function DriverDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    const token = parts.length === 2 ? parts.pop()?.split(';').shift() : null;

    if (!token) {
      router.push('/driver/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/stats/driver`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [API_URL, router]);

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
          <span className="sp-caps" style={{ color: 'var(--n-600)' }}>Earning Stats</span>
        </div>
        <button onClick={() => router.push('/driver/radar')} className="sp-btn-brand" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
          <Navigation size={14} /> ดูเรดาร์
        </button>
      </nav>

      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        <header className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-400)' }}>Performance Summary</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900, color: 'var(--n-50)' }}>
            สรุปรายได้ของคุณ
          </h1>
          <p style={{ color: 'var(--n-600)', fontSize: '0.9rem', marginTop: '0.25rem' }}>ยินดีด้วย! คุณทำงานได้เยี่ยมมากในวันนี้</p>
        </header>

        <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="sp-card-dark" style={{ borderLeft: '3px solid var(--brand-500)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--brand-500)', color: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <DollarSign size={24} />
              </div>
              <span className="sp-caps" style={{ color: 'var(--n-500)', fontWeight: 700 }}>รายได้รวมทั้งหมดวันนี้</span>
            </div>
            <div className="sp-stat-number" style={{ fontSize: '3.5rem', color: 'var(--n-50)' }}>
              ฿{stats?.totalIncome?.toLocaleString() || 0}
            </div>
          </div>

          <div className="sp-card-dark" style={{ borderLeft: '3px solid oklch(65% 0.12 220)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <CloudRain size={16} style={{ color: 'oklch(65% 0.12 220)' }} />
                 <span className="sp-caps" style={{ color: 'var(--n-500)', fontWeight: 700 }}>โบนัสค่าสภาพอากาศ (Surge)</span>
              </div>
              <TrendingUp size={18} style={{ color: 'var(--brand-400)' }} />
            </div>
            <div className="sp-stat-number" style={{ fontSize: '2.25rem', color: 'var(--brand-400)' }}>
              + ฿{stats?.weatherBonus?.toLocaleString() || 0}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="sp-card-dark">
              <span className="sp-caps" style={{ color: 'var(--n-600)', fontSize: '0.7rem' }}>งานที่กำลังส่ง</span>
              <div className="sp-stat-number" style={{ fontSize: '2rem', color: 'var(--n-50)', marginTop: '0.5rem' }}>{stats?.activeOrders || 0}</div>
              <div className="sp-caps" style={{ color: 'var(--n-700)', marginTop: '0.25rem' }}>ออเดอร์</div>
            </div>
            <div className="sp-card-dark">
              <span className="sp-caps" style={{ color: 'var(--n-600)', fontSize: '0.7rem' }}>ส่งสำเร็จแล้ว</span>
              <div className="sp-stat-number" style={{ fontSize: '2rem', color: 'var(--n-50)', marginTop: '0.5rem' }}>{stats?.completedTrips || 0}</div>
              <div className="sp-caps" style={{ color: 'var(--n-700)', marginTop: '0.25rem' }}>ออเดอร์</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
