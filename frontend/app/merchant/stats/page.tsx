'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownLeft, Wallet, Activity, CheckCircle, Printer
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

export default function MerchantStatsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };


  const fetchData = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Merchant') { router.push('/login'); return; }
    try {
      const [analyticsRes, profileRes] = await Promise.all([
        fetch('/api/proxy/orders/analytics'),
        fetch('/api/proxy/users/me')
      ]);
      
      if (profileRes.ok) {
        const p = await profileRes.json();
        setBalance(p.balance || 0);
      }
      
      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        setData(analytics);
      }
    } catch (err) { console.warn(err); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => { window.print(); };

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/proxy/orders/export/csv?${params.toString()}`);
      if (!res.ok) { toast.error('ดาวน์โหลดไม่สำเร็จ'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swiftpath-orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Network Error'); }
    finally { setExportLoading(false); }
  };

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

  const COLOR_CLASSES = ['bg-[#ea580c]', 'bg-[#3b82f6]', 'bg-[#10b981]', 'bg-[#f59e0b]', 'bg-[#64748b]', 'bg-[#ef4444]'];

  return (
    <div className="sp-page stats-page">
      <nav className="sp-nav no-print">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted flex items-center gap-1.5 border-none bg-transparent cursor-pointer">
          <ArrowLeft size={16} /> กลับไปยัง Dashboard
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span> Analytics</span>
        <div className="flex gap-2 items-center">
          <button onClick={handlePrint} className="sp-btn-ghost">
            <Printer size={16} /> พิมพ์รายงาน
          </button>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto py-10 px-6">
        
        <header className="sp-animate mb-10">
          <span className="sp-section-eyebrow">Enterprise Intelligence</span>
          <h1 className="sp-font-display sp-text-lg font-black">แผงควบคุมสถิติขั้นสูง</h1>
          <p className="text-[var(--n-500)] mt-1">ภาพรวมทางธุรกิจและการกระจายตัวของสถานะออเดอร์ทั้งหมดของร้าน</p>
        </header>

        {/* ── CSV Export Panel ── */}
        <div className="sp-card no-print mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1">
            <div className="sp-caps text-[var(--n-500)] mb-2 flex items-center gap-1.5">
              <Download size={12} /> ดาวน์โหลดรายงาน CSV
            </div>
            <p className="text-[var(--n-400)] text-[0.8rem]">เลือกช่วงวันที่ (ถ้าไม่เลือก = ดึงทั้งหมด) แล้วกดดาวน์โหลด เปิดได้ใน Excel</p>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="sp-field">
              <label className="sp-label">จากวันที่</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="sp-input w-[150px]" />
            </div>
            <div className="sp-field">
              <label className="sp-label">ถึงวันที่</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="sp-input w-[150px]" />
            </div>
            <button
              id="btn-export-csv"
              onClick={handleExportCsv}
              disabled={exportLoading}
              className="sp-btn-brand py-2.5 px-5 whitespace-nowrap"
            >
              {exportLoading ? <span className="sp-spinner" /> : <><Download size={15} /> ดาวน์โหลด CSV</>}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-10">
          
          <div className="sp-card sp-animate-d1 flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-100)] text-[var(--brand-600)] flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="sp-caps text-[var(--n-500)]">ยอดถอนได้ (Wallet)</p>
              <h2 className="sp-font-display text-[1.75rem] font-black mt-1">฿{Number(balance).toLocaleString()}</h2>
            </div>
          </div>

          <div className="sp-card sp-animate-d1 flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="sp-caps text-[var(--n-500)]">รายได้รวมทั้งหมด</p>
              <h2 className="sp-font-display text-[1.75rem] font-black mt-1 text-[#10b981]">฿{Number(data?.totalRevenue || 0).toLocaleString()}</h2>
            </div>
          </div>

          <div className="sp-card sp-animate-d2 flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div>
              <p className="sp-caps text-[var(--n-500)]">ออเดอร์ทั้งหมด</p>
              <h2 className="sp-font-display text-[1.75rem] font-black mt-1">{data?.totalOrders || 0} รายการ</h2>
            </div>
          </div>

          <div className="sp-card sp-animate-d2 flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[#faf5ff] text-[#a855f7] flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="sp-caps text-[var(--n-500)]">อัตราความสำเร็จ</p>
              <h2 className="sp-font-display text-[1.75rem] font-black mt-1 text-[#a855f7]">{data?.successRate || 0}%</h2>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-6 mb-10">
          
          <div className="sp-card sp-animate-d3 p-8">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h3 className="sp-font-display sp-text-md font-extrabold">แนวโน้มรายได้ 90 วันย้อนหลัง</h3>
                <p className="text-[var(--n-500)] text-[0.85rem]">แสดงรายได้จากออเดอร์ที่จัดส่งสำเร็จตามวันที่</p>
              </div>
            </div>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height={300} minWidth={0} initialDimension={{ width: 600, height: 300 }}>
                <LineChart data={data?.revenueChart || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(5)} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val}`} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white rounded-lg border border-slate-200 shadow-md p-2 text-xs">
                            <p className="text-slate-500 font-medium">วันที่: {label}</p>
                            <p className="text-orange-600 font-bold mt-1">รายได้: ฿{Number(payload[0].value).toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="sp-card sp-animate-d3 p-8 flex flex-col">
            <div>
              <h3 className="sp-font-display sp-text-md font-extrabold">สัดส่วนสถานะออเดอร์</h3>
              <p className="text-[var(--n-500)] text-[0.85rem]">Distribution of current statuses</p>
            </div>
            <div className="flex-1 flex items-center justify-center h-full min-h-[250px]">
              <ResponsiveContainer width="100%" height={250} minWidth={0} initialDimension={{ width: 300, height: 250 }}>
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
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white rounded-lg border border-slate-200 shadow-md p-2 text-xs">
                            <p className="text-slate-700 font-semibold">{payload[0].name}: {payload[0].value} รายการ</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-[0.8rem]">
                  <div className={`w-2.5 h-2.5 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`} />
                  <span className="text-[var(--n-700)]">{entry.name} <strong className="text-[var(--n-900)]">({entry.value})</strong></span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
