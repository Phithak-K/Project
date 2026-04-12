'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiDollarSign, FiPackage, FiTruck, FiCheckCircle } from 'react-icons/fi';

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

  if (loading) return <div className="text-center mt-20">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-black text-slate-800">สรุปยอดขายของร้านค้า (วันนี้)</h1>
          <p className="text-slate-500 text-sm mt-1">ดูและจัดการสถิติร้านค้าที่นี่</p>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 col-span-2">
            <div className="flex items-center gap-3 mb-2 text-emerald-600 font-bold">
              <FiDollarSign className="bg-emerald-100 p-1.5 rounded-lg" size={32} />
              <p>ยอดขายวันนี้</p>
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">฿{stats?.todaySales?.toLocaleString() || 0}</h2>
            <p className="text-emerald-500 text-xs mt-2 font-medium bg-emerald-50 inline-block px-2 py-1 rounded">
              รวมค่าจัดส่งพิเศษช่วงฝนตกแล้ว
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <div className="text-indigo-500 mb-2 font-bold flex items-center gap-2">
              <FiPackage /> รอยืนยัน
            </div>
            <h2 className="text-3xl font-black text-slate-800">{stats?.pendingOrders || 0}</h2>
            <p className="text-slate-400 text-xs mt-1">ออเดอร์</p>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <div className="text-amber-500 mb-2 font-bold flex items-center gap-2">
              <FiTruck /> กำลังส่ง
            </div>
            <h2 className="text-3xl font-black text-slate-800">{stats?.shippingOrders || 0}</h2>
            <p className="text-slate-400 text-xs mt-1">ออเดอร์</p>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 col-span-2 flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-400">
            <div>
              <div className="text-white/80 mb-1 font-bold flex items-center gap-2 text-sm">
                <FiCheckCircle /> ส่งสำเร็จแล้ว
              </div>
              <h2 className="text-3xl font-black text-white">{stats?.deliveredOrders || 0} รายการ</h2>
            </div>
            <div className="text-white text-opacity-30 text-6xl">🎉</div>
          </div>
        </div>
      </div>
    </div>
  );
}
