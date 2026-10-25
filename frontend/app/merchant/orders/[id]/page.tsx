'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, DollarSign, 
  MessageSquare, Shield, AlertCircle, ChevronRight, User, Share2, Download,
  Edit3, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import OrderMap from '@/components/OrderMap';
import ChatBox from '@/components/ChatBox';
import PremiumModal from '@/components/PremiumModal';
import { shareTracking } from '@/lib/share';

const STATUS_FLOW = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'SHIPPING', 'DELIVERED'];

export default function MerchantOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'confirm'|'danger'|'prompt', title: string, message: string, onConfirm: (val?: string) => void }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    receiverName: '',
    receiverPhone: '',
    address: '',
    productDetail: '',
  });

  const openEditModal = () => {
    if (!order) return;
    setEditForm({
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      address: order.address || '',
      productDetail: order.productDetail || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveCustomerInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.receiverName.trim()) {
      toast.error('กรุณาระบุชื่อผู้รับ');
      return;
    }
    if (!editForm.receiverPhone.trim()) {
      toast.error('กรุณาระบุเบอร์โทรศัพท์');
      return;
    }
    if (!editForm.address.trim()) {
      toast.error('กรุณาระบุที่อยู่จัดส่ง');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/proxy/orders/${orderId}/customer-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        toast.success('อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว');
        setIsEditModalOpen(false);
        await fetchOrder();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'ไม่สามารถอัปเดตข้อมูลได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setSavingEdit(false);
    }
  };

  const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'https://project-wi39.onrender.com');
  const { id: orderId } = use(params);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchOrder = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Merchant') { router.push('/login'); return; }
    try {
      const res = await fetch(`/api/proxy/orders/${orderId}`);
      if (res.ok) setOrder(await res.json());
      else        router.push('/merchant');
    } catch (err) { console.warn(err); }
    finally { setLoading(false); }
  }, [orderId, router]);

  useEffect(() => {
    fetchOrder();
    
    let socket: Socket | null = null;
    async function initSocket() {
      let token = '';
      try {
        const tokenRes = await fetch('/api/auth/token');
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.token;
        }
      } catch (err) {
        console.error("Failed to fetch token for socket", err);
      }

      if (token) {
        socket = io(SOCKET_URL, { auth: { token: `Bearer ${token}` }, withCredentials: true });
        socket.emit('join_order', { orderId: Number(orderId) });
        socket.on('order_status_update', () => fetchOrder());
      }
    }
    
    initSocket();
    
    return () => { if (socket) socket.disconnect(); };
  }, [orderId, fetchOrder, SOCKET_URL]);

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  const handleShareLine = async () => {
    // [BUG-03 FIX] ห้ามใช้ window.location.origin เพราะหน้านี้อยู่บน store.localhost:3000
    // ลิงก์ติดตามต้องชี้ Root Domain — ใช้ getTrackingUrl() ตัวเดียว
    // กับที่ og:image ใช้ ไม่งั้นการ์ดพรีวิวจะชี้คนละ URL กับลิงก์ที่ส่งจริง
    const text = `ร้านได้รับออเดอร์ของคุณแล้ว!\nตรวจสอบสถานะการจัดส่งได้ที่ลิงก์นี้เลยครับ:`;
    
    const result = await shareTracking(order.trackingNumber, text);
    if (result === 'copied') {
      toast.success('คัดลอกลิงก์สำเร็จ นำไปวางในแชท LINE ได้เลย');
    } else if (result === 'failed') {
      toast.error('ไม่สามารถคัดลอกข้อความได้');
    }
    // 'shared' / 'cancelled' — share sheet ของเครื่องบอกผลเองอยู่แล้ว ไม่ต้อง toast ซ้ำ
  };

  const handleDownloadPdf = async () => {
    const role = getCookie('role');
    if (!role) {
      toast.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }
    
    try {
      toast.loading('กำลังสร้างไฟล์ PDF...', { id: 'pdf' });
      const res = await fetch(`/api/proxy/orders/${orderId}/pdf`);
      
      if (!res.ok) throw new Error('Failed to fetch PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-order-${order.trackingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('ดาวน์โหลดสำเร็จ', { id: 'pdf' });
    } catch (err) {
      console.warn(err);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้', { id: 'pdf' });
    }
  };

  const handleCancelOrder = () => {
    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: 'ยกเลิกออเดอร์',
      message: `ยืนยันการยกเลิกออเดอร์ ${order.trackingNumber} ใช่หรือไม่?`,
      onConfirm: async () => {
        setCancelling(true);
        try {
          const res = await fetch(`/api/proxy/orders/${orderId}/cancel`, { method: 'PATCH' });
          if (res.ok) {
            toast.success('ยกเลิกออเดอร์เรียบร้อยแล้ว');
            await fetchOrder();
          } else {
            const errData = await res.json();
            toast.error(errData.message || 'ไม่สามารถยกเลิกออเดอร์ได้');
          }
        } catch {
          toast.error('Network Error');
        } finally {
          setCancelling(false);
        }
      }
    });
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-sm">
          <ArrowLeft size={16} /> กลับไปยังแดชบอร์ด
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div className="w-[120px]" />
      </nav>

      <main className="max-w-[900px] mx-auto py-10 px-6">
        
        <div className="sp-animate flex justify-between items-end mb-10 gap-4 flex-wrap">
          <div>
            <span className="sp-section-eyebrow">รายละเอียดออเดอร์</span>
            <div className="flex items-center gap-3">
              <h1 className="sp-font-display sp-text-lg font-black">{order.trackingNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-[var(--n-500)] text-[0.9rem] mt-1">
              สร้างเมื่อ {new Date(order.createdAt).toLocaleString('th-TH')}
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button onClick={handleShareLine} className="sp-btn-primary sp-btn-line">
              <Share2 size={16} /> ส่งลิงก์ให้ลูกค้า
            </button>
            {/* [BUG-04 FIX] ปุ่มแชทเปิดหน้า messages แทนไม่ทำอะไร */}
            <button
              className="sp-btn-ghost"
              onClick={() => setIsChatOpen(true)}
              disabled={!order.driverId}
            >
              <MessageSquare size={16} /> แชทกับคนขับ
            </button>
            {/* [BUG-04 FIX] แสดงปุ่มยกเลิกเฉพาะ PENDING และมี onClick handler */}
            {order.status === 'PENDING' && (
              <button
                className="sp-btn-danger bg-[var(--error-bg)] text-[var(--error-text)]"
                onClick={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกออเดอร์'}
              </button>
            )}
          </div>
        </div>

        <div className="sp-detail-grid">
          
          <div className="sp-stagger">
            {/* Timeline Row */}
            <div className="sp-card mb-6">
              <h3 className="sp-caps text-[var(--n-400)] mb-6">สถานะการขนส่ง</h3>
              <div className="sp-timeline pl-2">
                {STATUS_FLOW.map((status, index) => {
                  const isDone = index <= currentStepIndex;
                  const isNow = index === currentStepIndex;
                  return (
                    <div key={status} className={`sp-timeline-item mb-6 ${isDone ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`sp-timeline-dot ${isNow ? 'sp-timeline-dot-active' : ''} ${isDone ? 'bg-[var(--brand-500)]' : 'bg-[var(--n-200)]'}`} />
                      <div>
                        <p className="font-bold text-[var(--n-900)] text-[0.95rem]"><StatusLabel status={status} /></p>
                        {isNow && <p className="text-xs text-[var(--brand-600)] mt-0.5">กำลังดำเนินการในขั้นตอนนี้</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details Table */}
            <div className="sp-card">
              <div className="flex justify-between items-center mb-5">
                <h3 className="sp-caps text-[var(--n-400)] m-0">ข้อมูลการจัดส่ง</h3>
                {(order.status === 'PENDING' || order.status === 'ACCEPTED') && (
                  <button
                    onClick={openEditModal}
                    className="sp-btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> แก้ไขข้อมูล
                  </button>
                )}
              </div>
              <div className="sp-split-2">
                <div className="flex gap-3">
                  <User size={18} className="text-[var(--n-300)] mt-0.5" />
                  <div>
                    <p className="sp-caps text-[var(--n-400)] text-[0.7rem]">ผู้รับ</p>
                    <p className="font-bold">{order.receiverName}</p>
                    <p className="text-sm text-[var(--n-600)]">{order.receiverPhone}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin size={18} className="text-[var(--n-300)] mt-0.5" />
                  <div>
                    <p className="sp-caps text-[var(--n-400)] text-[0.7rem]">ที่อยู่</p>
                    <p className="text-sm text-[var(--n-700)] leading-normal">{order.address}</p>
                  </div>
                </div>
              </div>
              {order.productDetail && (
                <div className="mt-4 pt-4 border-t border-[var(--n-100)]">
                  <p className="sp-caps text-[var(--n-400)] text-[0.7rem]">รายละเอียด / หมายเหตุสินค้า</p>
                  <p className="text-sm text-[var(--n-700)] mt-1 whitespace-pre-wrap">{order.productDetail}</p>
                </div>
              )}
            </div>

            {/* Map Card */}
            {order.status !== 'PENDING' && order.status !== 'CANCELLED' && (
              <div className="sp-card p-0 overflow-hidden">
                <OrderMap 
                  lat={order.lat || 13.7563} 
                  lng={order.lng || 100.5018} 
                  label={order.receiverName || 'ที่อยู่จัดส่ง'} 
                  orderId={order.id}
                  height="260px"
                />
              </div>
            )}
          </div>

          <aside className="sp-stagger [animation-delay:100ms]">
            {/* Price Card */}
            <div className="sp-card mb-6 bg-[var(--brand-50)]">
              <h3 className="sp-caps text-[var(--n-600)] mb-5">สรุปยอดชำระ</h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-[0.9rem]">
                  <span className="text-[var(--n-500)]">ยอดสินค้า</span>
                  <span className="text-[var(--n-900)]">฿{(order.price || 0).toLocaleString()}</span>
                </div>
                {order.hasInsurance && (
                  <div className="flex justify-between text-[0.9rem]">
                    <span className="text-[oklch(60%_0.15_270)] flex items-center gap-1.5">
                      <Shield size={14} /> ประกันสินค้า
                    </span>
                    <span className="text-[var(--n-900)]">+ ฿50</span>
                  </div>
                )}
                <div className="h-px bg-[var(--n-200)] my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="sp-caps text-[var(--n-500)]">รวมสุทธิ</span>
                  <span className="sp-stat-number text-[2rem] text-[var(--n-900)]">
                    ฿{(order.totalPrice || order.price).toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={handleDownloadPdf}
                  className="sp-btn-ghost w-full mt-4 bg-white"
                >
                  <Download size={16} /> ดาวน์โหลดใบส่งของ (PDF)
                </button>
              </div>
            </div>

            {/* Driver Card */}
            {order.driver ? (
              <div className="sp-card">
                <h3 className="sp-caps text-[var(--n-400)] mb-5">คนขับที่รับงาน</h3>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--n-100)] flex items-center justify-center text-[var(--n-400)]">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{order.driver.name}</p>
                    <p className="text-xs text-[var(--n-400)]">{order.driver.vehiclePlate || 'ทะเบียน xxxx'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sp-card border border-dashed border-[var(--n-200)] bg-[var(--n-50)]">
                <div className="flex items-center gap-4">
                  <Clock size={20} className="sp-spinner text-[var(--brand-500)]" />
                  <div>
                    <p className="font-bold text-[var(--n-500)]">กำลังจับคู่คนขับ</p>
                    <p className="text-xs text-[var(--n-400)]">โปรดรอสักครู่ ระบบกำลังกระจายงาน</p>
                  </div>
                </div>
              </div>
            )}
          </aside>

        </div>

      </main>

      {/* ChatBox Widget */}
      {order.driverId && (
        <ChatBox 
          orderId={order.id}
          currentRole="Merchant"
          receiverRole="Driver"
          receiverId={order.driverId}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      <PremiumModal {...modalConfig} onClose={() => setModalConfig(p => ({ ...p, isOpen: false }))} />

      {/* Edit Customer Info Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden border border-[var(--n-200)]">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--n-200)]">
              <div className="flex items-center gap-2.5">
                <div className="bg-[rgba(25,118,210,0.1)] p-2 rounded-xl text-[var(--brand-500)] flex">
                  <Edit3 size={18} />
                </div>
                <h3 className="m-0 text-lg font-extrabold text-[var(--n-900)]">แก้ไขข้อมูลการจัดส่ง</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                disabled={savingEdit}
                className="bg-transparent border-0 cursor-pointer text-[var(--n-400)] p-1 hover:text-[var(--n-600)]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerInfo}>
              <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block sp-caps text-xs text-[var(--n-600)] mb-1">
                    ชื่อผู้รับ <span className="text-[var(--error-text)]">*</span>
                  </label>
                  <input
                    type="text"
                    className="sp-input"
                    value={editForm.receiverName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, receiverName: e.target.value }))}
                    placeholder="เช่น สมชาย ใจดี"
                    required
                  />
                </div>

                <div>
                  <label className="block sp-caps text-xs text-[var(--n-600)] mb-1">
                    เบอร์โทรศัพท์ <span className="text-[var(--error-text)]">*</span>
                  </label>
                  <input
                    type="tel"
                    className="sp-input"
                    value={editForm.receiverPhone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, receiverPhone: e.target.value }))}
                    placeholder="เช่น 0812345678"
                    required
                  />
                </div>

                <div>
                  <label className="block sp-caps text-xs text-[var(--n-600)] mb-1">
                    ที่อยู่จัดส่ง <span className="text-[var(--error-text)]">*</span>
                  </label>
                  <textarea
                    className="sp-input"
                    rows={3}
                    value={editForm.address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="ระบุบ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"
                    required
                  />
                </div>

                <div>
                  <label className="block sp-caps text-xs text-[var(--n-600)] mb-1">
                    รายละเอียดสินค้า / หมายเหตุ
                  </label>
                  <textarea
                    className="sp-input"
                    rows={2}
                    value={editForm.productDetail}
                    onChange={(e) => setEditForm(prev => ({ ...prev, productDetail: e.target.value }))}
                    placeholder="ระบุรายละเอียด เช่น วางไว้หน้าประตู"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-[var(--bg-body)] border-t border-[var(--n-200)] flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingEdit}
                  className="sp-btn-secondary py-2 px-4 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="sp-btn-primary py-2 px-5 rounded-lg"
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'sp-badge sp-badge-pending', ACCEPTED: 'sp-badge sp-badge-accepted',
    PICKED_UP: 'sp-badge sp-badge-picked', SHIPPING: 'sp-badge sp-badge-shipping',
    DELIVERED: 'sp-badge sp-badge-delivered', CANCELLED: 'sp-badge sp-badge-cancelled',
  };
  const labels: Record<string, string> = {
    PENDING: 'รอยืนยัน', ACCEPTED: 'รับงานแล้ว', PICKED_UP: 'รับพัสดุแล้ว',
    SHIPPING: 'กำลังส่ง', DELIVERED: 'สำเร็จ', CANCELLED: 'ยกเลิก',
  };
  return <span className={map[status] || 'sp-badge sp-badge-pending'}>{labels[status] || status}</span>;
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PENDING: 'รอระบบส่งงานให้คนขับ', ACCEPTED: 'คนขับยอมรับงานแล้ว', PICKED_UP: 'พัสดุถูกรับโดยคนขับ',
    SHIPPING: 'พัสดุอยู่ในระหว่างการจัดส่ง', DELIVERED: 'พัสดุถึงมือผู้รับเรียบร้อย',
  };
  return <span>{labels[status] || status}</span>;
}
