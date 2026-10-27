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
    <div className="sp-page flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-[var(--n-200)] border-t-[var(--brand-500)] rounded-full animate-spin mx-auto" />
        <p className="sp-caps text-[var(--n-500)] mt-4">Loading History</p>
      </div>
    </div>
  );

  return (
    <div className="sp-page min-h-screen flex flex-col">
      <nav className="sp-nav p-0">
        <div className="max-w-[800px] mx-auto w-full flex items-center h-full px-6">
          <Link href="/driver" className="flex items-center gap-2 text-[var(--n-600)] font-bold text-sm uppercase">
            <ArrowLeft size={16} /> กลับหน้าหลัก
          </Link>
        </div>
      </nav>

      <main className="max-w-[800px] mx-auto py-12 px-6 w-full flex-1">
        <div className="sp-animate-d1 mb-10">
          <span className="sp-section-eyebrow text-[var(--brand-600)]">YOUR ACTIVITY</span>
          <h1 className="sp-font-display font-black text-3xl sm:text-4xl md:text-5xl leading-none mt-2 tracking-tight text-[var(--n-900)]">
            ประวัติการส่งของ
          </h1>
        </div>

        {/* KPI Stats */}
        <div className="sp-animate-d1 grid grid-cols-2 gap-4 mb-12">
          <div className="sp-card p-6 border border-[var(--n-200)]">
            <div className="flex items-center gap-2 text-[var(--n-600)] mb-2">
              <CheckCircle2 size={16} />
              <span className="sp-caps">งานที่ส่งสำเร็จ</span>
            </div>
            <p className="sp-font-display text-3xl font-black text-[var(--n-900)]">
              {stats.totalDelivered} <span className="text-base text-[var(--n-500)] font-semibold">งาน</span>
            </p>
          </div>
          <div className="sp-card p-6 bg-[var(--brand-50)] border border-[var(--brand-200)]">
            <div className="flex items-center gap-2 text-[var(--brand-700)] mb-2">
              <Banknote size={16} />
              <span className="sp-caps">ยอดเงินสด (COD) รวม</span>
            </div>
            <p className="sp-font-display text-3xl font-black text-[var(--brand-800)]">
              ฿{stats.totalCashCollected.toLocaleString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="sp-animate p-4 border-l-4 border-l-[var(--error-text)] bg-[var(--error-bg)] text-[var(--error-text)] mb-8 text-sm">
            {error}
          </div>
        )}

        {history.length === 0 ? (
          <div className="sp-animate-d2 sp-card py-16 text-center bg-[var(--n-50)]">
            <Clock size={32} className="text-[var(--n-500)] mx-auto mb-4" />
            <p className="sp-caps text-[var(--n-500)]">ยังไม่มีประวัติการส่ง</p>
          </div>
        ) : (
          <div className="sp-animate-d2 flex flex-col gap-4">
            {history.map(order => (
              <div key={order.id} className="sp-card p-6 flex flex-wrap items-center justify-between gap-6 border border-[var(--n-200)]">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-[var(--brand-50)] rounded-lg flex items-center justify-center text-[var(--brand-600)] shrink-0">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="sp-mono font-bold text-[var(--brand-600)] text-sm">{order.trackingNumber}</p>
                    <p className="text-[var(--n-900)] text-lg mt-0.5 font-bold">{order.productName}</p>
                    <p className="text-[var(--n-500)] text-sm mt-1">
                      ผู้รับ: {order.receiverName} ({order.receiverPhone})
                    </p>
                    <p className="text-[var(--n-500)] text-xs mt-0.5">
                      ส่งเมื่อ: {new Date(order.updatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="sp-font-display font-black text-xl text-[var(--n-900)]">
                    ฿{(order.totalPrice || order.price)?.toLocaleString()}
                  </p>
                  <p className="sp-caps text-[var(--success-text)] text-xs bg-[rgba(46,125,50,0.1)] py-1 px-2 rounded">
                    ส่งสำเร็จ
                  </p>
                  {order.proofOfDelivery && (
                    <img 
                      src={order.proofOfDelivery} 
                      alt="POD" 
                      className="w-[60px] h-[60px] object-cover rounded-md border border-[var(--n-200)] mt-2" 
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
