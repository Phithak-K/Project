'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Package, CloudRain, TrendingUp, Navigation } from 'lucide-react';

export default function DriverDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; role=`);
    const role = p.length === 2 ? p.pop()?.split(';').shift() : null;

    if (!role || role !== 'Driver') {
      router.push('/driver/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/proxy/orders/stats/driver');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) return (
    <div className="sp-page-loading bg-[var(--n-50)]">
      <span className="sp-spinner sp-spinner-lg border-t-[var(--brand-500)]" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <div className="flex items-center gap-3">
          <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps text-[var(--n-600)]">Earning Stats</span>
        </div>
        <button onClick={() => router.push('/driver/radar')} className="sp-btn-brand py-2 px-4 text-xs">
          <Navigation size={14} /> ดูเรดาร์
        </button>
      </nav>

      <main className="max-w-[520px] mx-auto py-8 px-5">
        <header className="sp-animate mb-10">
          <span className="sp-section-eyebrow text-[var(--brand-400)]">Performance Summary</span>
          <h1 className="sp-font-display sp-text-lg font-black text-[var(--n-900)]">
            สรุปรายได้ของคุณ
          </h1>
          <p className="text-[var(--n-600)] text-sm mt-1">ยินดีด้วย! คุณทำงานได้เยี่ยมมากในวันนี้</p>
        </header>

        <div className="sp-stagger flex flex-col gap-4">
          
          <div className="sp-card border-l-[3px] border-l-[var(--brand-500)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-[var(--brand-500)] text-white p-2 rounded-lg">
                <DollarSign size={24} />
              </div>
              <span className="sp-caps text-[var(--n-500)] font-bold">รายได้รวมทั้งหมดวันนี้</span>
            </div>
            <div className="sp-stat-number text-[3.5rem] text-[var(--n-900)] leading-none">
              ฿{stats?.totalIncome?.toLocaleString() || 0}
            </div>
          </div>

          <div className="sp-card border-l-[3px] border-l-[oklch(65%_0.12_220)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                 <CloudRain size={16} className="text-[oklch(65%_0.12_220)]" />
                 <span className="sp-caps text-[var(--n-500)] font-bold">โบนัสค่าสภาพอากาศ (Surge)</span>
              </div>
              <TrendingUp size={18} className="text-[var(--brand-400)]" />
            </div>
            <div className="sp-stat-number text-4xl text-[var(--brand-400)]">
              + ฿{stats?.weatherBonus?.toLocaleString() || 0}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="sp-card">
              <span className="sp-caps text-[var(--n-600)] text-[0.7rem]">งานที่กำลังส่ง</span>
              <div className="sp-stat-number text-3xl text-[var(--n-900)] mt-2">{stats?.activeOrders || 0}</div>
              <div className="sp-caps text-[var(--n-700)] mt-1">ออเดอร์</div>
            </div>
            <div className="sp-card">
              <span className="sp-caps text-[var(--n-600)] text-[0.7rem]">ส่งสำเร็จแล้ว</span>
              <div className="sp-stat-number text-3xl text-[var(--n-900)] mt-2">{stats?.completedTrips || 0}</div>
              <div className="sp-caps text-[var(--n-700)] mt-1">ออเดอร์</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
