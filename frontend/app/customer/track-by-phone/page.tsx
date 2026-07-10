'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Search, Package, ArrowRight, Clock, CheckCircle, Truck, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:   { label: 'รอดำเนินการ', color: '#d97706', bg: '#fefce8', icon: Clock },
  ACCEPTED:  { label: 'รับงานแล้ว',  color: '#2563eb', bg: '#eff6ff', icon: Package },
  PICKED_UP: { label: 'รับพัสดุแล้ว', color: '#7c3aed', bg: '#faf5ff', icon: Package },
  SHIPPING:  { label: 'กำลังจัดส่ง', color: '#0284c7', bg: '#f0f9ff', icon: Truck },
  DELIVERED: { label: 'ส่งสำเร็จ',   color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  CANCELLED: { label: 'ยกเลิก',     color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

export default function TrackByPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setOrders([]);
    setSearched(false);
    try {
      const res = await fetch(`${API_URL}/orders/track-by-phone/${encodeURIComponent(phone.trim())}`);
      if (res.ok) {
        setOrders(await res.json());
      } else {
        const err = await res.json();
        alert(err.message || 'ไม่สามารถค้นหาได้');
      }
    } catch { alert('Network Error'); }
    finally { setLoading(false); setSearched(true); }
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <Link href="/" className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          ← หน้าหลัก
        </Link>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ width: '80px' }} />
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* ── Hero ── */}
        <div className="sp-animate" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '1.25rem',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', boxShadow: '0 8px 24px -4px rgba(234,88,12,0.4)'
          }}>
            <Phone size={28} color="white" />
          </div>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>ค้นหาประวัติออเดอร์</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.5rem' }}>
            กรอกเบอร์โทรศัพท์ที่ใช้รับพัสดุ เพื่อดูประวัติการสั่งและสถานะจัดส่ง
          </p>
        </div>

        {/* ── Search Form ── */}
        <form onSubmit={handleSearch} className="sp-card sp-animate" style={{ marginBottom: '2rem' }}>
          <label className="sp-label" style={{ marginBottom: '0.75rem', display: 'block' }}>เบอร์โทรศัพท์ผู้รับพัสดุ</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              className="sp-input" style={{ flex: 1 }}
              placeholder="08XXXXXXXX"
              required
            />
            <button
              id="btn-search-phone" type="submit" disabled={loading}
              className="sp-btn-brand" style={{ padding: '0.6rem 1.5rem', whiteSpace: 'nowrap' }}
            >
              {loading ? <span className="sp-spinner" /> : <><Search size={15} /> ค้นหา</>}
            </button>
          </div>
          <p style={{ color: 'var(--n-400)', fontSize: '0.75rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <AlertCircle size={12} /> ข้อมูลจะแสดงเฉพาะออเดอร์ที่ระบุเบอร์โทรนี้เป็นผู้รับเท่านั้น
          </p>
        </form>

        {/* ── Results ── */}
        {searched && (
          <div className="sp-animate">
            {orders.length === 0 ? (
              <div className="sp-empty-centered" style={{ padding: '3rem' }}>
                <Package size={36} className="sp-empty-icon" />
                <p className="sp-empty-title">ไม่พบออเดอร์</p>
                <p className="sp-empty-body">ไม่มีประวัติการสั่งซื้อสำหรับเบอร์ {phone}</p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem', color: 'var(--n-500)', fontSize: '0.85rem' }}>
                  พบ <strong style={{ color: 'var(--n-800)' }}>{orders.length}</strong> รายการสำหรับเบอร์ {phone}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.map(order => {
                    const cfg = statusConfig[order.status] || statusConfig.PENDING;
                    const StatusIcon = cfg.icon;
                    const totalAmount = Number(order.totalPrice || order.price);
                    return (
                      <div key={order.id} className="sp-card" style={{ cursor: 'pointer' }} onClick={() => router.push(`/track/${order.trackingNumber}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-600)', fontSize: '0.85rem' }}>
                              {order.trackingNumber}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--n-800)', marginTop: '0.2rem' }}>
                              {order.productName || (order.items?.length > 0 ? `สินค้า ${order.items.length} รายการ` : '-')}
                            </div>
                            {order.merchant?.storeName && (
                              <div style={{ color: 'var(--n-500)', fontSize: '0.8rem' }}>จากร้าน: {order.merchant.storeName}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '2rem', background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <StatusIcon size={13} /> {cfg.label}
                          </div>
                        </div>

                        {/* Items breakdown */}
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
                            {new Date(order.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--n-900)' }}>
                              ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                            <ArrowRight size={16} style={{ color: 'var(--n-300)' }} />
                          </div>
                        </div>

                        {order.trackingLogs?.[0] && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--n-50)', fontSize: '0.78rem', color: 'var(--n-500)' }}>
                            อัปเดตล่าสุด: {order.trackingLogs[0].note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
