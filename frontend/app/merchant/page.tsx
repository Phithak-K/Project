'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Truck, CheckCircle, Clock, LogOut, ChevronRight, RefreshCcw } from 'lucide-react';

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState({ pending: 0, shipping: 0, delivered: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // 1. Helper: อ่านคุกกี้
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // 2. ฟังก์ชันดึงข้อมูลจาก Backend
  const fetchData = useCallback(async () => {
    const token = getCookie('token');
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setIsRefreshing(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // ดึงทั้ง Stats และ Orders พร้อมกัน
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/orders/stats`, { headers }),
        fetch(`${API_URL}/orders/my-orders`, { headers })
      ]);

      if (statsRes.ok && ordersRes.ok) {
        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();

        setLiveStats({
          pending: statsData.pendingCount,
          shipping: statsData.shippingCount || 0, // สมมติว่า Backend ส่งค่านี้มาด้วย
          delivered: statsData.completedToday
        });
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  // แมปข้อมูล Stats เข้ากับ UI เดิมของคุณ
  const statsUI = [
    { label: 'รอยืนยัน', value: liveStats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
    { label: 'กำลังส่ง', value: liveStats.shipping, color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
    { label: 'สำเร็จ (วันนี้)', value: liveStats.delivered, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">กำลังเตรียมข้อมูลร้านค้า...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg shadow-purple-100">
            <Package size={20} />
          </div>
          <span className="font-black text-xl text-slate-800 tracking-tight">
            SwiftPath <span className="text-purple-600">Merchant</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchData} className={`text-slate-400 hover:text-purple-600 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
            <RefreshCcw size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 font-bold hover:text-red-500 transition-all px-4 py-2 rounded-xl hover:bg-red-50"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900">แผงควบคุมร้านค้า</h2>
            <p className="text-slate-500 font-medium">จัดการออเดอร์และดูยอดขายวันนี้</p>
          </div>
          
          <Link href="/create-order">
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-purple-200 flex items-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95 w-full md:w-auto justify-center">
              <Plus size={20} />
              สร้างออเดอร์ใหม่
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          {statsUI.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-hover hover:shadow-md">
              <div className={`${item.bg} ${item.color} p-4 rounded-2xl`}>
                <item.icon size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">รายการออเดอร์ล่าสุด</h3>
            <button onClick={fetchData} className="text-purple-600 text-sm font-bold hover:underline">รีเฟรชรายการ</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">ID</th>
                  <th className="px-8 py-5">ผู้รับ</th>
                  <th className="px-8 py-5">สถานะ</th>
                  <th className="px-8 py-5">ราคา</th>
                  <th className="px-8 py-5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5 font-bold text-purple-600">#{order.id}</td>
                    <td className="px-8 py-5 font-bold text-slate-700">{order.customerName || 'ลูกค้าทั่วไป'}</td>
                    <td className="px-8 py-5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-8 py-5 text-slate-600 font-bold">฿{order.totalPrice.toLocaleString()}</td>
                    <td className="px-8 py-5 text-right">
                      <Link href={`/orders/${order.id}`}>
                        <button className="text-slate-300 group-hover:text-purple-600 transition-colors">
                          <ChevronRight size={20} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {orders.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-medium">
              ยังไม่มีรายการพัสดุในขณะนี้
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Component แยกสำหรับแสดง Status Badge ให้สีเปลี่ยนตามสถานะจริง
function StatusBadge({ status }: { status: string }) {
  const config: any = {
    PENDING: { label: 'รอยืนยัน', color: 'bg-yellow-50 text-yellow-600' },
    SHIPPING: { label: 'กำลังส่ง', color: 'bg-blue-50 text-blue-600' },
    DELIVERED: { label: 'สำเร็จ', color: 'bg-green-50 text-green-600' },
    CANCELLED: { label: 'ยกเลิก', color: 'bg-red-50 text-red-600' },
  };

  const current = config[status] || { label: status, color: 'bg-slate-50 text-slate-600' };

  return (
    <span className={`${current.color} text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wide inline-block`}>
      {current.label}
    </span>
  );
}