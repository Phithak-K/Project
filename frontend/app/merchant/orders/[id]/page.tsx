'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { FiMapPin, FiPackage, FiTruck, FiCheckCircle, FiClock, FiDollarSign } from 'react-icons/fi';

const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'SHIPPING', 'DELIVERED'];

export default function MerchantOrderTrackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const orderId = params.id;

  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/merchant/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          router.push('/merchant');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    const newSocket = io(API_URL, { auth: { token: `Bearer ${token}` } });
    newSocket.emit('join_order', { orderId: Number(orderId) });

    newSocket.on('order_status_update', (updated: any) => {
      console.log("WS status Update", updated);
      fetchOrder(); // refresh logs & image
    });

    return () => { newSocket.disconnect(); };
  }, [API_URL, orderId, router]);

  if (loading) return <div className="text-center mt-20">กำลังโหลด...</div>;
  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">รหัสออเดอร์</p>
               <h1 className="text-xl font-black text-slate-800">{order.trackingNumber}</h1>
             </div>
             <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <FiDollarSign /> {order.totalPrice || order.price}
             </div>
          </div>
          <div className="flex bg-slate-50 p-4 rounded-2xl items-center gap-3">
             <div className="bg-white shadow-sm p-3 rounded-xl text-teal-500 shrink-0 border border-slate-100">
               <FiPackage size={24} />
             </div>
             <div>
               <p className="font-bold text-slate-800">{order.productName}</p>
               <p className="text-xs text-slate-500">ปลายทาง: {order.receiverName}</p>
             </div>
          </div>
        </header>

        {/* Live Timeline Display */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-bold mb-6 text-slate-800 flex items-center gap-2">
            <span className="text-teal-500">📍</span>
            สถานะการจัดส่ง (Live)
          </h3>

          <div className="relative pl-6 space-y-8 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-slate-200">
             {STATUS_FLOW.map((status, index) => {
               const isCompleted = index <= currentStepIndex;
               const isCurrent = index === currentStepIndex;

               // Labels matching status
               let title = '';
               let icon = <FiClock size={12} />;
               if (status === 'PENDING') { title = 'ค้นหาคนขับ'; icon = <FiClock size={12} />; }
               if (status === 'ACCEPTED') { title = 'คนขับกดรับงานแล้ว'; icon = <FiTruck size={12} />; }
               if (status === 'PICKED_UP') { title = 'คนขับรับพัสดุจากร้านคุณ'; icon = <FiPackage size={12} />; }
               if (status === 'SHIPPING') { title = 'อยู่ในระหว่างจัดส่ง'; icon = <FiMapPin size={12} />; }
               if (status === 'DELIVERED') { title = 'ลูกค้าได้รับพัสดุเรียบร้อย'; icon = <FiCheckCircle size={12} />; }

               return (
                 <div key={status} className={`relative ${!isCompleted ? 'opacity-40' : ''}`}>
                    <div className={`absolute -left-9 top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center
                      ${isCurrent ? 'bg-teal-500 text-white shadow-[0_0_10px_rgba(20,184,166,0.5)]' : isCompleted ? 'bg-teal-500 text-white' : 'bg-slate-300'}
                    `}>
                      {icon}
                    </div>
                    {isCurrent && <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-teal-500 animate-ping opacity-20"></div>}
                    
                    <p className={`font-bold ${isCurrent ? 'text-teal-600' : 'text-slate-700'}`}>{title}</p>
                 </div>
               );
             })}
          </div>
        </div>

      </div>
    </div>
  );
}
