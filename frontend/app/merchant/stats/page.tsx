'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, CreditCard, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, Filter, Search, Printer, Activity, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function MerchantStatsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [balance, setBalance] = useState(0);
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
      
      const [analyticsRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/orders/analytics`, { headers }),
        fetch(`${API_URL}/auth/profile`, { headers })
      ]);
      
      if (profileRes.ok) {
        const p = await profileRes.json();
        setBalance(p.balance || 0);
      }
      
      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        setData(analytics);
      }

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [API_URL, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => { window.print(); };

  if (loading) return <div className="sp-page-loading"><span className="sp-spinner sp-spinner-lg" /></div>;

  const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#f59e0b', '#64748b', '#ef4444'];
  const pieData = data?.statusDistribution ? [
    { name: 'ส่งสำเร็จ', value: data.statusDistribution.DELIVERED || 0 },
    { name: 'กำลังส่ง', value: data.statusDistribution.SHIPPING || 0 },
    { name: 'รับของแล้ว', value: data.statusDistribution.PICKED_UP || 0 },
    { name: 'คนขับรับงาน', value: data.statusDistribution.ACCEPTED || 0 },
    { name: 'รอดำเนินการ', value: data.statusDistribution.PENDING || 0 },
    { name: 'ยกเลิก', value: data.statusDistribution.CANCELLED || 0 },
  ].filter(d => d.value > 0) : [];

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

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        <header className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Enterprise Intelligence</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>แผงควบคุมสถิติขั้นสูง</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.25rem' }}>ภาพรวมทางธุรกิจและการกระจายตัวของสถานะออเดอร์ในเดือนนี้</p>
        </header>

        {/* Global Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          
          <div className="sp-card sp-animate-d1" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={24} />
            </div>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ยอดถอนได้ (Wallet)</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.25rem' }}>฿{Number(balance).toLocaleString()}</h2>
            </div>
          </div>

          <div className="sp-card sp-animate-d1" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>รายได้รวมเดือนนี้</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.25rem', color: '#10b981' }}>฿{Number(data?.totalRevenue || 0).toLocaleString()}</h2>
            </div>
          </div>

          <div className="sp-card sp-animate-d2" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={24} />
            </div>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ออเดอร์ทั้งหมด</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.25rem' }}>{data?.totalOrders || 0} รายการ</h2>
            </div>
          </div>

          <div className="sp-card sp-animate-d2" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#faf5ff', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>อัตราความสำเร็จ</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.25rem', color: '#a855f7' }}>{data?.successRate || 0}%</h2>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          
          <div className="sp-card sp-animate-d3" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="sp-font-display sp-text-md" style={{ fontWeight: 800 }}>แนวโน้มรายได้ 7 วันย้อนหลัง</h3>
                <p style={{ color: 'var(--n-500)', fontSize: '0.85rem' }}>แสดงรายได้จากออเดอร์ที่จัดส่งสำเร็จตามวันที่</p>
              </div>
            </div>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.revenueChart || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val}`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'รายได้']}
                    labelFormatter={(label) => `วันที่: ${label}`}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="sp-card sp-animate-d3" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div>
              <h3 className="sp-font-display sp-text-md" style={{ fontWeight: 800 }}>สัดส่วนสถานะออเดอร์</h3>
              <p style={{ color: 'var(--n-500)', fontSize: '0.85rem' }}>Distribution of current statuses</p>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                     contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     formatter={(value: any) => [`${value} รายการ`, 'จำนวน']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
              {pieData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span style={{ color: 'var(--n-700)' }}>{entry.name} <strong style={{color:'var(--n-900)'}}>({entry.value})</strong></span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
