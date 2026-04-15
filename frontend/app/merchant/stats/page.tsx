'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, CreditCard, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, Filter, Search, Printer
} from 'lucide-react';

export default function MerchantStatsPage() {
  const router = useRouter();
  const [data, setData] = useState({ balance: 0, transactions: [], stats: { todaySales: 0 } });
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchData = useCallback(async () => {
    const token = getCookie('token');
    if (!token) { router.push('/login'); return; }
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      // Fetching merchant profile/balance + some order stats
      const [statsRes, merchantRes] = await Promise.all([
        fetch(`${API_URL}/orders/stats`, { headers }),
        fetch(`${API_URL}/auth/profile`, { headers }) // Assuming profile has balance
      ]);
      
      let balance = 0;
      let todaySales = 0;

      if (merchantRes.ok) {
        const m = await merchantRes.json();
        balance = m.balance || 0;
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        todaySales = s.todaySales || 0;
      }

      // Simulation of transactions based on orders for now if actual transaction endpoint isn't ready
      // In real app, we would fetch /transactions/mine
      const ordersRes = await fetch(`${API_URL}/orders/my-orders`, { headers });
      let txs = [];
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        txs = orders
          .filter((o: any) => o.status === 'DELIVERED')
          .map((o: any) => ({
            id: o.id,
            type: 'CREDIT',
            amount: o.price,
            note: `ค่าสินค้าออเดอร์ #${o.trackingNumber}`,
            createdAt: o.updatedAt
          }));
      }

      setData({ balance, stats: { todaySales }, transactions: txs });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [API_URL, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="sp-page-loading"><span className="sp-spinner sp-spinner-lg" /></div>;

  return (
    <div className="sp-page stats-page">
      <nav className="sp-nav no-print">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> กลับไปยัง Dashboard
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span> Analytics</span>
        <button onClick={handlePrint} className="sp-btn-ghost">
          <Printer size={16} /> พิมพ์รายงาน
        </button>
      </nav>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        <header className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Financial Report</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>สถิติและกระเป๋าเงิน</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.25rem' }}>สรุปยอดรายได้และการทำรายการทั้งหมดของร้านคุณ</p>
        </header>

        {/* Financial Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          
          <div className="sp-card-dark" style={{ background: 'var(--brand-900)', border: '1px solid var(--brand-700)', position: 'relative', overflow: 'hidden' }}>
            <Wallet size={120} style={{ position: 'absolute', right: '-20px', bottom: '-20px', color: 'var(--brand-500)', opacity: 0.1 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span className="sp-caps" style={{ color: 'var(--brand-500)', fontSize: '0.7rem' }}>Current Balance</span>
              <div className="sp-stat-number" style={{ fontSize: '3rem', color: 'var(--n-50)', marginTop: '0.5rem' }}>
                ฿{data.balance.toLocaleString()}
              </div>
              <p style={{ color: 'var(--brand-200)', fontSize: '0.8rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={14} /> พร้อมถอนเข้าบัญชีหลัก
              </p>
            </div>
          </div>

          <div className="sp-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <span className="sp-caps" style={{ color: 'var(--n-400)', fontSize: '0.7rem' }}>Revenue Today</span>
                <div className="sp-font-display" style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem' }}>
                  ฿{data.stats.todaySales.toLocaleString()}
                </div>
              </div>
              <div className="sp-badge-success" style={{ height: 'fit-content' }}>
                <TrendingUp size={12} /> +12%
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <p className="sp-caps" style={{ color: 'var(--n-400)', fontSize: '0.6rem' }}>ยอดขายรวม</p>
                <p style={{ fontWeight: 700 }}>฿{(data.stats.todaySales * 1.4).toLocaleString()}</p>
              </div>
              <div>
                <p className="sp-caps" style={{ color: 'var(--n-400)', fontSize: '0.6rem' }}>จำนวนออเดอร์</p>
                <p style={{ fontWeight: 700 }}>{data.transactions.length} orders</p>
              </div>
            </div>
          </div>

        </div>

        {/* Transaction History Section */}
        <section className="sp-animate-d1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="sp-section-title">ประวัติรายการเงินเข้า-ออก</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className="sp-btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}><Filter size={14} /> ตัวกรอง</button>
            </div>
          </div>

          <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="sp-table">
               <thead className="sp-thead">
                 <tr>
                   <th className="sp-th">วันที่/เวลา</th>
                   <th className="sp-th">รายละเอียด</th>
                   <th className="sp-th">ประเภท</th>
                   <th className="sp-th" style={{ textAlign: 'right' }}>จำนวนเงิน</th>
                 </tr>
               </thead>
               <tbody>
                 {data.transactions.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="sp-td" style={{ textAlign: 'center', padding: '4rem', color: 'var(--n-400)' }}>
                       ยังไม่มีรายการเคลื่อนไหว
                     </td>
                   </tr>
                 ) : (
                   data.transactions.map((tx: any) => (
                     <tr key={tx.id} className="sp-tr">
                       <td className="sp-td" style={{ color: 'var(--n-500)', fontSize: '0.8rem' }}>
                         {new Date(tx.createdAt).toLocaleString('th-TH')}
                       </td>
                       <td className="sp-td" style={{ fontWeight: 600 }}>{tx.note}</td>
                       <td className="sp-td">
                         <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', background: tx.type === 'CREDIT' ? 'var(--success-bg)' : 'var(--error-bg)', color: tx.type === 'CREDIT' ? 'var(--success-text)' : 'var(--error-text)' }}>
                           {tx.type}
                         </span>
                       </td>
                       <td className="sp-td" style={{ textAlign: 'right', fontWeight: 900, color: tx.type === 'CREDIT' ? 'var(--success-text)' : 'var(--error-text)' }}>
                         {tx.type === 'CREDIT' ? '+' : '-'} ฿{tx.amount.toLocaleString()}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
            </table>
          </div>
        </section>

      </main>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .sp-page { background: white !important; }
          .sp-card { border: 1px solid #eee !important; box-shadow: none !important; }
          .sp-card-dark { background: #f8f8f8 !important; color: black !important; border: 1px solid #ddd !important; }
          .sp-stat-number { color: black !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function CheckCircle({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
