'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiDollarSign, FiPackage, FiCloudLightning, FiTrendingUp } from 'react-icons/fi';

export default function DriverDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  if (loading) return <div className="text-center mt-20 text-white">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">สรุปรายได้ของคุณ (วันนี้)</h1>
          <p className="text-slate-400 text-sm mt-1">ยินดีด้วย! คุณทำงานได้เยี่ยมมาก</p>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-5 rounded-3xl shadow-xl border border-slate-700 col-span-2 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-emerald-500/10 text-9xl">
               <FiDollarSign />
            </div>
            <div className="flex items-center gap-3 mb-2 text-emerald-400 font-bold relative z-10">
              <FiDollarSign className="bg-emerald-500/20 p-1.5 rounded-lg" size={32} />
              <p>รายได้รวมทั้งหมดวันนี้</p>
            </div>
            <h2 className="text-5xl font-black text-white tracking-tight relative z-10">฿{stats?.totalIncome?.toLocaleString() || 0}</h2>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl shadow-xl col-span-2">
            <div className="flex justify-between items-center">
              <div>
                 <div className="text-indigo-100 mb-1 font-bold flex items-center gap-2">
                   <FiCloudLightning className="text-yellow-400" /> โบนัสค่าสภาพอากาศ (Surge)
                 </div>
                 <h2 className="text-3xl font-black text-white">
                   + ฿{stats?.weatherBonus?.toLocaleString() || 0}
                 </h2>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                 <FiTrendingUp size={28} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-5 rounded-3xl shadow-xl border border-slate-700">
            <div className="text-amber-400 mb-2 font-bold flex items-center gap-2">
              <FiPackage /> งานในมือ
            </div>
            <h2 className="text-3xl font-black text-slate-100">{stats?.activeOrders || 0}</h2>
            <p className="text-slate-500 text-xs mt-1">ออเดอร์</p>
          </div>

          <div className="bg-slate-800 p-5 rounded-3xl shadow-xl border border-slate-700">
            <div className="text-teal-400 mb-2 font-bold flex items-center gap-2">
              <FiPackage /> ส่งสำเร็จ
            </div>
            <h2 className="text-3xl font-black text-slate-100">{stats?.completedTrips || 0}</h2>
            <p className="text-slate-500 text-xs mt-1">ออเดอร์</p>
          </div>

        </div>
      </div>
    </div>
  );
}
