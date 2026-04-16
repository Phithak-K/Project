'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Package, Truck, CheckCircle, Plus } from 'lucide-react';
import Link from 'next/link';

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    const token = parts.length === 2 ? parts.pop()?.split(';').shift() : null;

    if (!token) {
      router.push('/merchant/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/stats`, {
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
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps" style={{ color: 'var(--n-400)' }}>Merchant Stats</span>
        </div>
        <Link href="/create-order">
          <button className="sp-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <Plus size={14} /> สร้างออเดอร์
          </button>
        </Link>
      </nav>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <header className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Store Intelligence</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900, color: 'var(--n-900)' }}>
            สรุปยอดขายของร้านค้า
          </h1>
          <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', marginTop: '0.25rem' }}>ดูและจัดการสถิติร้านค้าวันนี้</p>
        </header>

        <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="sp-card" style={{ borderLeft: '3px solid var(--success-text)', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <DollarSign size={24} />
              </div>
              <span className="sp-caps" style={{ color: 'var(--n-400)', fontWeight: 700 }}>ยอดขายพัสดุรวมวันนี้</span>
            </div>
            <div className="sp-stat-number" style={{ fontSize: '3.5rem', color: 'var(--n-900)' }}>
              ฿{stats?.todaySales?.toLocaleString() || 0}
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="sp-badge sp-badge-delivered">
                <CheckCircle size={12} /> รวมค่า Surge แล้ว
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="sp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning-text)' }}>
                <Package size={16} />
                <span className="sp-caps" style={{ fontSize: '0.7rem' }}>รอยืนยัน</span>
              </div>
              <div className="sp-stat-number" style={{ fontSize: '2rem', color: 'var(--n-900)', marginTop: '0.5rem' }}>{stats?.pendingOrders || 0}</div>
              <div className="sp-caps" style={{ color: 'var(--n-400)', marginTop: '0.125rem' }}>ออเดอร์</div>
            </div>
            <div className="sp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--info-text)' }}>
                <Truck size={16} />
                <span className="sp-caps" style={{ fontSize: '0.7rem' }}>กำลังส่ง</span>
              </div>
              <div className="sp-stat-number" style={{ fontSize: '2rem', color: 'var(--n-900)', marginTop: '0.5rem' }}>{stats?.shippingOrders || 0}</div>
              <div className="sp-caps" style={{ color: 'var(--n-400)', marginTop: '0.125rem' }}>ออเดอร์</div>
            </div>
          </div>

          <div className="sp-card-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="sp-caps" style={{ color: 'var(--n-600)' }}>ส่งสำเร็จพัสดุถึงมือผู้รับ</span>
              <div className="sp-stat-number" style={{ fontSize: '1.75rem', color: 'var(--n-50)', marginTop: '0.25rem' }}>
                {stats?.deliveredOrders || 0} รายการ
              </div>
            </div>
            <CheckCircle size={32} style={{ color: 'var(--success-text)', opacity: 0.8 }} />
          </div>

        </div>
      </main>
    </div>
  );
}
