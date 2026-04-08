'use client';

import { useState, useEffect } from 'react';
import { Truck, MapPin, Package, Navigation, LogOut, CheckCircle, Clock } from 'lucide-react';

export default function DriverDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  
  // 1. ฟังก์ชัน Logout สำหรับคนขับ
  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  // 2. ข้อมูลสมมติออเดอร์ที่ "ว่างอยู่" (รอคนขับมากดรับ)
  // ในอนาคตจะใช้ useEffect ดึงข้อมูลจาก API: GET /orders/available
  const availableOrders = [
    { id: 'SP-9921', shop: 'ร้านสมใจการค้า', distance: '1.2 km', dropoff: 'หมู่บ้านพฤกษา 1', price: 45 },
    { id: 'SP-9922', shop: 'เจ๊หมวยของสด', distance: '3.5 km', dropoff: 'คอนโดลุมพินี', price: 60 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-lg text-white shadow-lg shadow-orange-100">
            <Truck size={20} />
          </div>
          <span className="font-black text-xl text-slate-800 tracking-tight">SwiftPath <span className="text-orange-500">Fleet</span></span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="ออกจากระบบ"
        >
          <LogOut size={22} />
        </button>
      </nav>

      <main className="p-6 max-w-lg mx-auto">
        {/* Driver Status Card */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white mb-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">สถานะปัจจุบัน</p>
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              พร้อมรับงาน
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-3 rounded-2xl">
                <p className="text-[10px] text-slate-300 uppercase">งานวันนี้</p>
                <p className="text-xl font-bold">8 งาน</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <p className="text-[10px] text-slate-300 uppercase">รายได้สะสม</p>
                <p className="text-xl font-bold">฿480</p>
              </div>
            </div>
          </div>
          <Truck className="absolute -right-4 -bottom-4 text-white/5" size={120} />
        </div>

        {/* Available Orders List */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <Clock size={20} className="text-orange-500" />
            งานใหม่ใกล้ตัวคุณ
          </h3>
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">
            {availableOrders.length} รายการ
          </span>
        </div>

        <div className="space-y-5">
          {availableOrders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-95">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl text-slate-400">
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg leading-none mb-1">{order.id}</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">{order.shop}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-orange-500 font-black text-xl">฿{order.price}</p>
                  <p className="text-slate-300 text-[10px] font-bold uppercase">{order.distance}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-slate-300 mt-1" />
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">ที่อยู่จัดส่ง</span>
                    {order.dropoff}
                  </p>
                </div>
              </div>

              <button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                onClick={() => alert(`รับงาน ${order.id} สำเร็จ! กรุณาเดินทางไปรับพัสดุที่ร้านค้า`)}
              >
                <Navigation size={20} />
                กดรับงานนี้
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Menu (Mobile Friendly) */}
        <div className="h-20"></div> {/* Spacer for safety */}
      </main>
    </div>
  );
}