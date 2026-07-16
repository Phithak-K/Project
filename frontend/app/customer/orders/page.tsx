'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Clock, CheckCircle, Truck, XCircle, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import OrderSkeleton from '@/components/OrderSkeleton';
import EmptyState from '@/components/EmptyState';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'รอดำเนินการ', color: '#d97706', bg: '#fefce8', icon: Clock },
  ACCEPTED:  { label: 'รับงานแล้ว',  color: '#2563eb', bg: '#eff6ff', icon: Package },
  PICKED_UP: { label: 'รับพัสดุแล้ว', color: '#7c3aed', bg: '#faf5ff', icon: Package },
  SHIPPING:  { label: 'กำลังจัดส่ง', color: '#0284c7', bg: '#f0f9ff', icon: Truck },
  DELIVERED: { label: 'ส่งสำเร็จ',   color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  CANCELLED: { label: 'ยกเลิก',     color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAuthToken = useCallback(() => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }, []);

  const fetchOrders = useCallback(async (currentPage: number, append: boolean = false) => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`${API_URL}/orders/customer/my-orders?page=${currentPage}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setOrders(prev => [...prev, ...data.data]);
        } else {
          setOrders(data.data);
        }
        setTotalPages(data.totalPages);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลประวัติออเดอร์ได้');
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [API_URL, router, getAuthToken]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage, true);
    }
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <Link href="/" className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          ← หน้าหลัก
        </Link>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <button className="sp-btn-ghost" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }} onClick={() => router.push('/customer/profile')}>
          <User size={18} />
        </button>
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>ประวัติการสั่งซื้อ</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.5rem' }}>
            รายการพัสดุที่คุณดำเนินการผ่านระบบทั้งหมด
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </div>
        ) : (
          <div className="sp-animate">
            {orders.length === 0 ? (
              <EmptyState 
                icon={Package}
                title="คุณยังไม่มีประวัติการสั่งซื้อ"
                description="เริ่มต้นใช้งานโดยการสั่งซื้อสินค้าผ่านร้านค้าพันธมิตรของเรา"
                actionLabel="กลับสู่หน้าหลัก"
                actionHref="/"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => {
                  const cfg = statusConfig[order.status] || statusConfig.PENDING;
                  const StatusIcon = cfg.icon;
                  const totalAmount = Number(order.totalPrice || order.price);
                  return (
                    <div key={order.id} className="sp-card" style={{ cursor: 'pointer' }} onClick={() => router.push(`/customer/orders/${order.id}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-600)', fontSize: '0.85rem' }}>
                            {order.trackingNumber}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--n-800)', marginTop: '0.2rem' }}>
                            {order.productName || (order.items?.length > 0 ? `สินค้า ${order.items.length} รายการ` : '-')}
                          </div>
                          {order.merchant?.storeName && (
                            <div style={{ color: 'var(--n-500)', fontSize: '0.8rem' }}>ร้าน: {order.merchant.storeName}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '2rem', background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <StatusIcon size={13} /> {cfg.label}
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--n-50)', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--n-600)', padding: '0.15rem 0' }}>
                              <span>{item.productName} ×{item.quantity}</span>
                              <span>฿{Number(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: 'var(--n-400)', fontSize: '0.75rem' }}>
                          {new Date(order.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--n-900)' }}>
                            ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <ArrowRight size={16} style={{ color: 'var(--n-300)' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {page < totalPages && (
                  <button 
                    onClick={handleLoadMore} 
                    disabled={loadingMore}
                    className="sp-btn-ghost" 
                    style={{ marginTop: '1rem', width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center' }}
                  >
                    {loadingMore ? <span className="sp-spinner" /> : 'โหลดเพิ่มเติม'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
