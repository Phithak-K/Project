'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Package, Truck, CheckCircle, Plus } from 'lucide-react';
import Link from 'next/link';

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; role=`);
    const role = p.length === 2 ? p.pop()?.split(';').shift() : null;

    if (!role || role !== 'Merchant') {
      router.push('/merchant/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/proxy/orders/stats');
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
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <div className="flex items-center gap-3">
          <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
          <span className="sp-caps text-[var(--n-400)]">Merchant Stats</span>
        </div>
        <div className="flex gap-2">
          <Link href="/merchant/history">
            <button className="sp-btn py-2 px-4 text-xs bg-[var(--n-100)] text-[var(--n-800)] border border-[var(--n-200)]">
              📜 ประวัติ
            </button>
          </Link>
          <Link href="/merchant/create-order">
            <button className="sp-btn-primary py-2 px-4 text-xs">
              <Plus size={14} /> สร้างออเดอร์
            </button>
          </Link>
        </div>
      </nav>

      <main className="max-w-[600px] mx-auto py-10 px-6">
        <header className="sp-animate mb-10">
          <span className="sp-section-eyebrow">Store Intelligence</span>
          <h1 className="sp-font-display sp-text-lg font-black text-[var(--n-900)]">
            สรุปยอดขายของร้านค้า
          </h1>
          <p className="text-[var(--n-500)] text-sm mt-1">ดูและจัดการสถิติร้านค้าวันนี้</p>
        </header>

        <div className="sp-stagger flex flex-col gap-4">
          
          <div className="sp-card border-l-[3px] border-l-[var(--success-text)] bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[var(--success-bg)] text-[var(--success-text)] p-2 rounded-lg">
                <DollarSign size={24} />
              </div>
              <span className="sp-caps text-[var(--n-400)] font-bold">ยอดขายพัสดุรวมวันนี้</span>
            </div>
            <div className="sp-stat-number text-[3.5rem] text-[var(--n-900)] leading-none">
              ฿{stats?.todaySales?.toLocaleString() || 0}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="sp-badge sp-badge-delivered">
                <CheckCircle size={12} /> รวมค่า Surge แล้ว
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="sp-card">
              <div className="flex items-center gap-2 text-[var(--warning-text)]">
                <Package size={16} />
                <span className="sp-caps text-[0.7rem]">รอยืนยัน</span>
              </div>
              <div className="sp-stat-number text-3xl text-[var(--n-900)] mt-2">{stats?.pendingOrders || 0}</div>
              <div className="sp-caps text-[var(--n-400)] mt-0.5">ออเดอร์</div>
            </div>
            <div className="sp-card">
              <div className="flex items-center gap-2 text-[var(--info-text)]">
                <Truck size={16} />
                <span className="sp-caps text-[0.7rem]">กำลังส่ง</span>
              </div>
              <div className="sp-stat-number text-3xl text-[var(--n-900)] mt-2">{stats?.shippingOrders || 0}</div>
              <div className="sp-caps text-[var(--n-400)] mt-0.5">ออเดอร์</div>
            </div>
          </div>

          <div className="sp-card flex justify-between items-center bg-[var(--n-50)]">
            <div>
              <span className="sp-caps text-[var(--n-400)]">ส่งสำเร็จพัสดุถึงมือผู้รับ</span>
              <div className="sp-stat-number text-2xl text-[var(--n-900)] mt-1">
                {stats?.deliveredOrders || 0} รายการ
              </div>
            </div>
            <CheckCircle size={32} className="text-[var(--success-text)] opacity-80" />
          </div>

        </div>
      </main>
    </div>
  );
}
