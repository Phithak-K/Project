'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FiTruck, FiMapPin, FiBox, FiPhone, 
  FiCheckCircle, FiNavigation, FiLogOut, FiRefreshCw 
} from 'react-icons/fi';

interface Order {
  id: number;
  trackingNumber: string;
  productName: string;
  receiverName: string;
  receiverPhone: string;
  address: string;
  totalPrice: number;
  status: string;
  weatherWarning?: string;
}

export default function DriverDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // 1. Helper: อ่าน Token จาก Cookie
  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // 2. ดึงข้อมูลงานที่ว่าง (findAllAvailable)
  const fetchJobs = useCallback(async () => {
    setRefreshing(true);
    const token = getAuthToken();
    if (!token) return window.location.href = '/login';

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/orders/available`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data);
      }
    } catch (error) {
      console.error("Fetch jobs error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // 3. ฟังก์ชันกดรับงาน (Accept Order)
  const handleAcceptOrder = async (orderId: number) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setActiveOrder(updatedOrder);
        alert('รับงานสำเร็จ! เริ่มการจัดส่งได้');
        fetchJobs(); // รีเฟรชรายการงานที่เหลือ
      } else {
        const err = await res.json();
        alert(err.message || 'รับงานไม่สำเร็จ');
      }
    } catch (err) { alert('Network Error'); }
  };

  // 4. ฟังก์ชันส่งงานสำเร็จ (Complete Order)
  const handleCompleteOrder = async (orderId: number) => {
    if (!confirm('ยืนยันว่าส่งพัสดุถึงมือผู้รับเรียบร้อยแล้ว?')) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/complete`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('ส่งงานสำเร็จ! ยอดเยี่ยมมาก');
        setActiveOrder(null);
        fetchJobs();
      }
    } catch (err) { alert('Network Error'); }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  if (loading) return <div className="p-8 text-center font-bold text-slate-400">กำลังค้นหางานในพื้นที่...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      {/* Header */}
      <nav className="bg-slate-800 p-6 flex justify-between items-center sticky top-0 z-20 shadow-xl border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FiTruck className="text-yellow-400 text-2xl" />
          <span className="font-black text-xl tracking-tighter">SWIFT<span className="text-yellow-400">FLEET</span></span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
          <FiLogOut size={20} />
        </button>
      </nav>

      <main className="p-4 max-w-md mx-auto space-y-6">
        
        {/* ส่วนที่ 1: งานที่รับไว้แล้ว (Active Job) */}
        {activeOrder ? (
          <div className="bg-yellow-400 text-slate-900 rounded-[2rem] p-6 shadow-2xl animate-in fade-in zoom-in">
            <h2 className="font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
              <FiNavigation className="animate-bounce" /> กำลังดำเนินการส่ง
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold opacity-60 uppercase">รหัสพัสดุ</p>
                <p className="text-xl font-black">#{activeOrder.trackingNumber}</p>
              </div>
              <div className="flex items-start gap-3 bg-white/20 p-4 rounded-2xl">
                <FiMapPin className="mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold">{activeOrder.receiverName}</p>
                  <p className="text-sm leading-tight opacity-80">{activeOrder.address}</p>
                  <a href={`tel:${activeOrder.receiverPhone}`} className="mt-2 inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">
                    <FiPhone /> โทรหาลูกค้า
                  </a>
                </div>
              </div>
              <button 
                onClick={() => handleCompleteOrder(activeOrder.id)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-lg"
              >
                ส่งงานสำเร็จ
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-[2rem] text-center">
            <p className="text-slate-400 font-bold">คุณยังไม่มีงานที่รับไว้</p>
          </div>
        )}

        {/* ส่วนที่ 2: บอร์ดรับงาน (Job Board) */}
        <div className="flex justify-between items-center px-2">
          <h3 className="font-black uppercase tracking-widest text-xs text-slate-500">งานที่ว่างอยู่ ({availableOrders.length})</h3>
          <button onClick={fetchJobs} disabled={refreshing} className="text-yellow-400">
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-4">
          {availableOrders.map((job) => (
            <div key={job.id} className="bg-slate-800 border border-slate-700 p-5 rounded-3xl hover:border-yellow-400/50 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-yellow-400 font-black text-lg">฿{job.totalPrice}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{job.productName}</p>
                </div>
                <span className="bg-slate-700 text-[10px] font-black px-3 py-1 rounded-full text-slate-300">#{job.trackingNumber}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-slate-400 mb-5">
                <FiMapPin className="text-slate-500 flex-shrink-0" />
                <p className="line-clamp-1">{job.address}</p>
              </div>

              {job.weatherWarning && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl mb-5 flex items-center gap-2 text-[10px] text-orange-400 font-bold">
                  <FiBox /> {job.weatherWarning}
                </div>
              )}

              <button 
                onClick={() => handleAcceptOrder(job.id)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-2xl font-black transition-all transform active:scale-95"
              >
                รับงานนี้
              </button>
            </div>
          ))}

          {availableOrders.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-600 font-bold">
              <FiBox size={40} className="mx-auto mb-2 opacity-20" />
              ยังไม่มีงานใหม่ในขณะนี้
            </div>
          )}
        </div>
      </main>
    </div>
  );
}