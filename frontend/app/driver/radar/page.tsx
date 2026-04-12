'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { FiMapPin, FiPackage, FiDollarSign, FiClock, FiCheckCircle } from 'react-icons/fi';

export default function DriverRadarPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/driver/login');
      return;
    }

    // 1. Fetch existing available orders
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/available`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to fetch available orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();

    // 2. Connect WebSocket for Real-time Radar
    const newSocket = io(API_URL, {
      auth: { token: `Bearer ${token}` }
    });

    newSocket.on('connect', () => {
      console.log(' radar connected: ', newSocket.id);
    });

    newSocket.on('new_available_order', (order: any) => {
      console.log('📡 New Order Radar Event!', order);
      // Play sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.error("Audio play failed:", e));
      
      setOrders(prev => {
        // Prevent duplicates
        if (prev.find(o => o.id === order.id)) return prev;
        return [order, ...prev];
      });
    });

    newSocket.on('order_taken', (data: { orderId: number }) => {
       // Remove from radar if another driver accepts it
       setOrders(prev => prev.filter(o => o.id !== data.orderId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL, router]);

  const handleAcceptOrder = async (orderId: number) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('🎉 ยินดีด้วย! คุณรับออเดอร์นี้สำเร็จ');
        router.push(`/driver/orders/${orderId}`);
      } else {
        const err = await res.json();
        alert(err.message || 'ไม่สามารถรับงานได้');
        // Refresh list
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (err) {
      alert('Network Error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 pb-24">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              RADAR
            </h1>
            <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
              กำลังค้นหางานใกล้คุณ...
            </p>
          </div>
          <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-xl">
             <div className="text-emerald-400 text-2xl animate-spin-slow">
               ⏳
             </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">กำลังโหลดเรดาร์...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32 opacity-50">
            <div className="text-6xl mb-4">🌀</div>
            <p className="text-lg">ยังไม่มีงานเข้ามาในขณะนี้</p>
            <p className="text-sm">เปิดหน้านี้ทิ้งไว้ ระบบจะแจ้งเตือนทันทีที่มีงาน</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden group">
                {/* Visual pulse for surge */}
                {order.weatherWarning && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500 animate-pulse"></div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                      <FiPackage className="text-emerald-400" /> {order.productName}
                    </h3>
                    <p className="text-slate-400 text-sm">รหัส: {order.trackingNumber}</p>
                  </div>
                  <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                     <FiDollarSign /> {order.totalPrice?.toLocaleString() || order.price}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-3 text-slate-300 text-sm bg-slate-900/50 p-3 rounded-2xl">
                    <FiMapPin className="mt-0.5 text-rose-400 shrink-0" />
                    <p className="leading-relaxed"><strong>ผู้รับ:</strong> {order.receiverName} <br/> <span className="opacity-80">{order.address}</span></p>
                  </div>
                  {order.weatherWarning && (
                    <div className="flex items-start gap-3 text-amber-300 text-xs bg-amber-900/20 p-3 rounded-2xl border border-amber-500/20">
                      <span className="mt-0.5">🌧️</span>
                      <p>{order.weatherWarning}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handleAcceptOrder(order.id)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <FiCheckCircle size={20} /> รับงานนี้เลย!
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
