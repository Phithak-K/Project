'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { FiMapPin, FiPackage, FiTruck, FiCheckCircle, FiCamera, FiMessageSquare } from 'react-icons/fi';
import ChatBox from '@/components/ChatBox';
import OrderMap from '@/components/OrderMap';
import QRScanner from '@/components/QRScanner';

export default function DriverOrderWorkflowPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // For Base64 Image
  const [proofImage, setProofImage] = useState<string | null>(null);

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
      router.push('/driver/login');
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
          alert('ไม่พบออเดอร์');
          router.push('/driver/radar');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    // WebSocket connect
    const newSocket = io(API_URL, {
      auth: { token: `Bearer ${token}` }
    });
    
    newSocket.emit('join_order', { orderId: Number(orderId) });

    newSocket.on('order_status_update', (updated: any) => {
      setOrder((prev: any) => ({ ...prev, ...updated }));
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [API_URL, orderId, router]);

  const updateStatus = async (endpoint: string, extraBody = {}) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/${endpoint}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(extraBody)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Error updating status');
      } else {
        // UI updates via websocket automatically
      }
    } catch {
      alert('Network error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="text-white text-center mt-20">กำลังโหลดข้อมูล...</div>;
  if (!order) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        <header>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FiPackage className="text-emerald-400" /> ออเดอร์ #{order.trackingNumber}
              </h1>
              <p className="text-slate-400 text-sm mt-1">สถานะปัจจุบัน: <span className="text-amber-400 font-bold">{order.status}</span></p>
            </div>
            
            <button 
              onClick={() => setIsChatOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
            >
              <FiMessageSquare size={20} />
            </button>
          </div>
        </header>

        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-xl space-y-4">
          <div className="flex items-start gap-4 pb-4 border-b border-slate-700">
            <div className="bg-slate-900 p-3 rounded-full text-indigo-400">
              <FiPackage size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-200">พัสดุ: {order.productName}</p>
              <p className="text-sm text-slate-400">{order.quantity} ชิ้น</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-rose-500/20 p-3 rounded-full text-rose-400">
              <FiMapPin size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-200">ปลายทาง: {order.receiverName}</p>
              <p className="text-sm text-slate-400">{order.address}</p>
              <p className="text-sm text-slate-400 mt-1">📞 {order.receiverPhone}</p>
            </div>
          </div>
        </div>

        {/* --- MAP --- */}
        {order.lat && order.lng && (
           <OrderMap lat={order.lat} lng={order.lng} label="จุดหมายปลายทาง" />
        )}

        {/* Action Buttons Based on Status */}
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-xl">
          <h3 className="font-bold text-lg mb-4 text-slate-300">อัปเดตสถานะการจัดส่ง</h3>
          
          {order.status === 'ACCEPTED' && (
             <button 
               onClick={() => updateStatus('pickup')}
               className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
             >
               ยืนยันการรับพัสดุจากร้านค้า
             </button>
          )}

          {order.status === 'PICKED_UP' && (
             <button 
               onClick={() => updateStatus('ship')}
               className="w-full bg-amber-500 hover:bg-amber-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
             >
               <FiTruck /> เริ่มเดินทางไปส่งผู้รับ
             </button>
          )}

          {order.status === 'SHIPPING' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">อัปโหลดรูปภาพหลักฐานการจัดส่ง:</p>
              <label className="block w-full border-2 border-dashed border-slate-600 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {proofImage ? (
                  <img src={proofImage} alt="Proof" className="mx-auto max-h-32 rounded-lg" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <FiCamera size={32} className="mb-2" />
                    <span>ถ่ายรูปหน้างานที่นี่</span>
                  </div>
                )}
              </label>

              <button 
                onClick={() => updateStatus('complete', { proofOfDelivery: proofImage })}
                disabled={!proofImage}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <FiCheckCircle size={20} /> ปิดงานจัดส่ง!
              </button>
            </div>
          )}

          {/* New QR Payment Scanner Step */}
          {order.status === 'DELIVERED' && order.paymentStatus === 'Unpaid' && (
            <div className="space-y-4 text-center">
              <p className="text-amber-400 font-bold">ลูกค้ายืนยันและสร้าง QR สำหรับชำระเงินแล้ว</p>
              <QRScanner 
                 onScanSuccess={async (decodedText) => {
                   try {
                     const data = JSON.parse(decodedText);
                     if (data.type === 'SwiftPath_Payment' && data.orderId === order.id) {
                       await updateStatus('pay');
                       alert('ชำระเงินสำเร็จ! เงินโอนเข้า Wallet ของคุณแล้ว');
                     } else {
                       alert('QR Code ไม่ถูกต้อง');
                     }
                   } catch {
                     alert('รูปแบบ QR ไม่รองรับ');
                   }
                 }}
              />
            </div>
          )}

          {/* Completed State */}
          {order.status === 'DELIVERED' && order.paymentStatus === 'Paid' && (
             <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center border border-emerald-500/30">
               <FiCheckCircle className="mx-auto mb-2" size={24} />
               <p className="font-bold">งานนี้เสร็จสมบูรณ์ และรับเงินเข้ากระเป๋าเรียบร้อย!</p>
             </div>
          )}
        </div>

      </div>

      <ChatBox 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        orderId={Number(orderId)} 
        currentRole="Driver" 
        receiverRole="Customer" 
        receiverId={order.customerId} 
      />
    </div>
  );
}
