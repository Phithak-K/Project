'use client';

import { useState, useEffect, useCallback } from 'react';
import { Truck, MapPin, Package, Navigation, LogOut, Clock, CloudRain } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DriverDashboard() {
  const router = useRouter();
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 1. Helper: อ่าน Token จาก Cookie
  const getAuthToken = useCallback(() => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }, []);

  // 2. ฟังก์ชัน Logout สำหรับคนขับ
  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  // 3. ฟังก์ชันดึงข้อมูลงานที่ว่างอยู่
  const fetchAvailableOrders = useCallback(async () => {
    setIsLoading(true);
    const token = getAuthToken();
    if (!token) {
      alert("ไม่พบเซสชัน กรุณาล็อกอิน");
      router.push('/driver/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders/available`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data);
      } else {
        console.error("Failed to fetch available orders");
      }
    } catch (err) {
      console.error("Network Error", err);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, getAuthToken, router]);

  useEffect(() => {
    fetchAvailableOrders();
  }, [fetchAvailableOrders]);

  // 4. ฟังก์ชันรับงาน
  const handleAcceptOrder = async (orderId: number) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        alert("รับงานสำเร็จ! กรุณาเดินทางไปรับพัสดุ");
        fetchAvailableOrders(); // โหลดข้อมูลใหม่
      } else {
        const err = await res.json();
        alert(err.message || "เกิดข้อผิดพลาดในการรับงาน");
      }
    } catch (error) {
      alert("Network Error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
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
                <p className="text-xl font-bold">- งาน</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <p className="text-[10px] text-slate-300 uppercase">รายได้สะสม</p>
                <p className="text-xl font-bold">- บาท</p>
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

        {isLoading ? (
          <div className="text-center text-slate-500 font-medium mt-10 animate-pulse">กำลังโหลดงาน...</div>
        ) : availableOrders.length === 0 ? (
          <div className="text-center text-slate-400 font-medium mt-10">ไม่พบงานที่ว่างในขณะนี้</div>
        ) : (
          <div className="space-y-5">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                
                {/* Weather Warning Badge */}
                {order.weatherWarning && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-black">
                    <CloudRain size={14} />
                    <span>Rainy - Surge Applied</span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-3 rounded-2xl text-slate-400">
                      <Package size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-lg leading-none mb-1">{order.trackingNumber}</p>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">{order.productName || 'พัสดุทั่วไป'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-black text-xl">฿{order.totalPrice || order.price}</p>
                    <p className="text-slate-300 text-[10px] font-bold uppercase">รอคนขับรับ</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-slate-300 mt-1" />
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">จุดหมายปลายทาง</span>
                      {order.address}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => handleAcceptOrder(order.id)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Navigation size={20} />
                  กดรับงานนี้
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="h-20"></div> {/* Spacer */}
      </main>
    </div>
  );
}