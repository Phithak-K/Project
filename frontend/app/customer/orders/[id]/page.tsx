'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { FiMapPin, FiPackage, FiTruck, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import OrderMap from '@/components/OrderMap';

const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'SHIPPING', 'DELIVERED'];

export default function CustomerOrderTrackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Rating State
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);

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
      router.push('/customer/login');
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
          // Check if already rated (using messages array logic or just hide rating UI if backend throws error, but simple is best)
        } else {
          router.push('/customer');
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
      // Fetch fresh order details to get latest logs
      fetchOrder();
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [API_URL, orderId, router]);

  const submitRating = async () => {
    if (ratingScore === 0) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: ratingScore, comment: ratingComment })
      });
      if (res.ok) {
        alert('ขอบคุณสำหรับคะแนนประเมิน!');
        setHasRated(true);
      } else {
        const error = await res.json();
        alert(error.message);
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="text-slate-500 font-bold">กำลังโหลดจุดพิกัด...</div></div>;
  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 pb-24 font-sans border-t-8 border-indigo-500">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">TRACKING NO</p>
          <h1 className="text-2xl font-black text-indigo-600 mb-4">{order.trackingNumber}</h1>
          <div className="flex items-center gap-3">
             <div className="bg-indigo-50 p-3 rounded-xl text-indigo-500 shrink-0">
               <FiPackage size={24} />
             </div>
             <div>
               <p className="font-bold text-lg text-slate-800">{order.productName}</p>
               <p className="text-sm text-slate-500">ร้านค้าพาร์ทเนอร์: {order.merchant?.storeName || 'ไม่ระบุ'}</p>
             </div>
          </div>
        </header>

        {/* Map Visualization (Leaflet) */}
        {order.lat && order.lng && (
          <OrderMap lat={order.lat} lng={order.lng} label={`ผู้รับ: ${order.receiverName}`} />
        )}

        {/* Live Timeline Display */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold mb-6 text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            สถานะการจัดส่ง
          </h3>

          <div className="relative pl-6 space-y-8 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-slate-200">
             {STATUS_FLOW.map((status, index) => {
               const isCompleted = index <= currentStepIndex;
               const isCurrent = index === currentStepIndex;

               // Labels matching status
               let title = '';
               let icon = <FiClock size={12} />;
               if (status === 'PENDING') { title = 'รอยืนยันเวลา'; icon = <FiClock size={12} />; }
               if (status === 'ACCEPTED') { title = 'เริ่มให้บริการ (คนขับรับงาน)'; icon = <FiTruck size={12} />; }
               if (status === 'PICKED_UP') { title = 'รับพัสดุจากร้านค้าแล้ว'; icon = <FiPackage size={12} />; }
               if (status === 'SHIPPING') { title = 'กำลังเดินทางไปส่งลูกค้า'; icon = <FiMapPin size={12} />; }
               if (status === 'DELIVERED') { title = 'จัดส่งสำเร็จเรียบร้อย'; icon = <FiCheckCircle size={12} />; }

               return (
                 <div key={status} className={`relative ${!isCompleted ? 'opacity-40' : ''}`}>
                    <div className={`absolute -left-9 top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center
                      ${isCurrent ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : isCompleted ? 'bg-indigo-500 text-white' : 'bg-slate-300'}
                    `}>
                      {icon}
                    </div>
                    {isCurrent && <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-indigo-500 animate-ping opacity-20"></div>}
                    
                    <p className={`font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-700'}`}>{title}</p>
                 </div>
               );
             })}
          </div>
        </div>

        {/* Proof of Delivery Card */}
        {order.status === 'DELIVERED' && order.proofOfDelivery && (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl shadow-sm">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
               <FiCheckCircle />
               รับพัสดุสำเร็จ & หลักฐานการจัดส่ง
            </h3>
            <div className="rounded-2xl overflow-hidden shadow-sm">
               <img src={order.proofOfDelivery} alt="Proof of delivery" className="w-full object-cover" />
            </div>
          </div>
        {/* Payment QR Code Request */}
        {order.status === 'DELIVERED' && order.paymentStatus === 'Unpaid' && (
          <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl flex flex-col items-center text-center">
            <h3 className="font-bold text-xl mb-2">🚚 ยอดชำระเงิน: ฿{order.totalPrice || order.price}</h3>
            <p className="text-indigo-200 text-sm mb-6">กรุณาแสดง QR Code นี้ให้คนขับสแกนเพื่อยืนยันการรับสินค้าและชำระเงิน</p>
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG 
                value={JSON.stringify({ orderId: order.id, type: 'SwiftPath_Payment', timestamp: Date.now() })} 
                size={200}
                level="Q"
                includeMargin={true}
              />
            </div>
          </div>
        )}
        
        {/* Payment Success Banner */}
        {order.paymentStatus === 'Paid' && (
          <div className="bg-emerald-500 text-white p-4 rounded-2xl text-center shadow-lg font-bold flex items-center justify-center gap-2">
            <FiCheckCircle size={24} /> ชำระเงินและการจัดส่งเสร็จสมบูรณ์!
          </div>
        )}

        {/* Driver Rating Component */}
        {order.paymentStatus === 'Paid' && !hasRated && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
            <h3 className="font-bold text-slate-800 mb-2">ให้คะแนนคนขับรถ</h3>
            <p className="text-sm text-slate-500 mb-4">บริการจัดส่งเป็นอย่างไรบ้าง?</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingScore(star)}
                  className={`text-3xl transition-transform ${ratingScore >= star ? 'text-amber-400 scale-110' : 'text-slate-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            {ratingScore > 0 && (
              <div className="space-y-3 animate-fade-in">
                <input 
                  type="text" 
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="เขียนคำชมเชยหรือข้อเสนอแนะ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                <button 
                  onClick={submitRating}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition"
                >
                  ส่งความคิดเห็น
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
