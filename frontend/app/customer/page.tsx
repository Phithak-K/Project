'use client';

import { useState } from 'react';
import { Search, Package, MapPin, Clock, CheckCircle, LogOut, Navigation } from 'lucide-react';

export default function CustomerDashboard() {
  const [trackingId, setTrackingId] = useState('');

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  // ข้อมูลสมมติประวัติการสั่งซื้อ
  const myOrders = [
    { id: 'SP-9921', status: 'กำลังจัดส่ง', from: 'ร้านสมใจการค้า', date: '06/04/2026' },
    { id: 'SP-9850', status: 'สำเร็จ', from: 'เจ๊หมวยของสด', date: '01/04/2026' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar สำหรับลูกค้า */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
            <Package size={20} />
          </div>
          <span className="font-black text-xl text-slate-800 tracking-tight">SwiftPath <span className="text-blue-600">App</span></span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={22} />
        </button>
      </nav>

      <main className="p-6 max-w-2xl mx-auto">
        {/* ส่วนค้นหาพัสดุ (Tracking Search) */}
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white mb-10 shadow-xl shadow-blue-100 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-2">ติดตามพัสดุของคุณ</h2>
            <p className="text-blue-100 text-sm mb-6 font-medium">ใส่หมายเลขพัสดุเพื่อเช็คสถานะแบบ Real-time</p>
            
            <div className="relative">
              <input 
                type="text" 
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="กรอกหมายเลขพัสดุ เช่น SP-XXXX"
                className="w-full py-4 px-6 pr-16 rounded-2xl text-slate-900 font-bold outline-none shadow-inner"
              />
              <button className="absolute right-2 top-2 bg-blue-500 hover:bg-blue-400 p-2.5 rounded-xl transition-all">
                <Search size={20} />
              </button>
            </div>
          </div>
          <Navigation className="absolute -right-6 -bottom-6 text-white/10" size={150} />
        </div>

        {/* ประวัติการสั่งซื้อ (Order History) */}
        <h3 className="font-black text-slate-800 text-lg mb-4 ml-2">พัสดุของฉัน</h3>
        <div className="space-y-4">
          {myOrders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${order.status === 'สำเร็จ' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Package size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{order.id}</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">{order.from}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  order.status === 'สำเร็จ' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {order.status}
                </span>
                <p className="text-slate-300 text-[10px] font-bold mt-1 uppercase">{order.date}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State กรณีไม่มีข้อมูล */}
        {myOrders.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Clock size={32} />
            </div>
            <p className="text-slate-400 font-bold">ยังไม่มีรายการพัสดุ</p>
          </div>
        )}
      </main>
    </div>
  );
}