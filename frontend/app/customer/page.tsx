'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Package, LogOut, Wallet, User, ChevronRight, Clock } from 'lucide-react';

export default function CustomerDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    if (!isMounted) return;

    const role = getCookie('role');
    if (!role || role !== 'Customer') {
      setIsLoggedIn(false);
      setIsLoading(false);
      return;
    }
    setIsLoggedIn(true);

    const fetchData = async () => {
      try {
        const [ordersRes, userRes] = await Promise.all([
          fetch('/api/proxy/orders/customer/my-orders'),
          fetch('/api/proxy/users/me')
        ]);
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          setOrders(oData.data || oData || []);
        }
        if (userRes.ok) {
          const userData = await userRes.json();
          setBalance(Number(userData.balance || 0));
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isMounted]);

  const handleLogout = async () => {
    const { handleLogout: clearAuth } = await import('@/lib/auth');
    await clearAuth();
    window.location.href = '/login';
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      router.push(`/track/${trackingInput.trim().toUpperCase()}`);
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="sp-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="sp-page">
      {/* Navbar */}
      <nav className="sp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
          <span className="sp-caps" style={{ color: 'var(--n-500)', borderLeft: '1px solid var(--n-200)', paddingLeft: '0.75rem' }}>
            Customer
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isLoggedIn ? (
            <>
              <Link href="/customer/wallet" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '4px' }}>
                  <Wallet size={16} /> Wallet: ฿{balance?.toLocaleString()}
                </button>
              </Link>
              <Link href="/customer/profile" style={{ textDecoration: 'none' }}>
                <button className="sp-btn-ghost" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--n-300)', color: 'var(--n-600)' }}>
                  <User size={16} />
                </button>
              </Link>
              <button onClick={handleLogout} className="sp-btn-danger" style={{ padding: '0.5rem', borderRadius: '4px' }}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link href="/customer/login" style={{ textDecoration: 'none' }}>
              <button className="sp-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> เข้าสู่ระบบ
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Main Dashboard */}
      <main className="sp-container" style={{ maxWidth: '680px', margin: '0 auto', paddingTop: '3rem', paddingBottom: '4rem' }}>
        
        {/* Tracking Search */}
        <div className="sp-card sp-animate" style={{ marginBottom: '2.5rem', padding: '1.75rem', background: '#fff', border: '1px solid var(--n-200)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', borderRadius: '16px' }}>
          <h2 className="sp-font-display" style={{ fontSize: '1.25rem', color: 'var(--n-900)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} style={{ color: 'var(--brand-500)' }} />
            ติดตามพัสดุ
          </h2>
          <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, padding: '0.875rem 1.25rem', background: 'var(--n-50)', border: '1px solid var(--n-200)', borderRadius: '10px', transition: 'border-color 0.2s' }}>
              <input
                type="text"
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                placeholder="กรอกหมายเลขพัสดุ (เช่น SP-1234-TH)"
                className="sp-input"
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1rem', color: 'var(--n-900)', padding: '0', fontWeight: 600 }}
              />
            </div>
            <button type="submit" className="sp-btn-touch sp-btn-primary" style={{ padding: '0 2rem', fontWeight: 800, borderRadius: '10px' }}>
              ค้นหา
            </button>
          </form>
        </div>

        {isLoggedIn ? (
          <div className="sp-animate-d1">
            {/* Recent Orders Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
              <div>
                <p className="sp-caps" style={{ color: 'var(--brand-600)' }}>ACTIVE</p>
                <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)' }}>รายการจัดส่งของคุณ</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <p style={{ color: 'var(--n-500)', fontSize: '0.875rem' }}>อัปเดตสถานะล่าสุด</p>
                <Link href="/customer/history" style={{ textDecoration: 'none', color: 'var(--brand-600)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  ดูประวัติทั้งหมด &rarr;
                </Link>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="sp-card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--n-50)' }}>
                <Clock size={32} style={{ color: 'var(--n-400)', margin: '0 auto 1rem' }} />
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ไม่มีรายการที่กำลังจัดส่ง</p>
                <p style={{ color: 'var(--n-600)', fontSize: '0.875rem', marginTop: '0.5rem' }}>เมื่อมีผู้ส่งสินค้าให้คุณ รายการจะปรากฏที่นี่</p>
              </div>
            ) : (
              <div className="sp-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => (
                  <Link key={order.id} href={`/customer/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                    <div className="sp-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', borderRadius: '12px' }}
                         onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-400)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
                         onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ width: '48px', height: '48px', background: 'var(--brand-50)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="sp-mono" style={{ fontWeight: 800, color: 'var(--brand-600)', fontSize: '0.85rem' }}>{order.trackingNumber}</p>
                          <p style={{ color: 'var(--n-900)', fontSize: '1rem', marginTop: '0.125rem', fontWeight: 700 }}>{order.productName}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <StatusBadge status={order.status} />
                        <ChevronRight size={18} style={{ color: 'var(--n-400)' }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Logged Out CTA */
          <div className="sp-card sp-animate-d1" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-200)', padding: '3rem 2rem', textAlign: 'center' }}>
            <h2 className="sp-font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-800)', marginBottom: '0.75rem' }}>จัดการพัสดุของคุณง่ายๆ</h2>
            <h3 style={{ color: 'var(--n-800)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>ต้องการจัดการพัสดุง่ายขึ้น?</h3>
            <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>เข้าสู่ระบบเพื่อดูประวัติและรับการแจ้งเตือน</p>
            <Link href="/customer/login" style={{ textDecoration: 'none' }}>
              <button className="sp-btn-ghost" style={{ padding: '0.75rem 2rem', fontWeight: 700, borderRadius: '8px' }}>
                เข้าสู่ระบบลูกค้า
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string, text: string, label: string }> = {
    PENDING:   { bg: 'var(--n-100)', text: 'var(--n-600)', label: 'รอดำเนินการ' },
    ACCEPTED:  { bg: 'var(--brand-100)', text: 'var(--brand-700)', label: 'รับงานแล้ว' },
    PICKED_UP: { bg: 'var(--brand-100)', text: 'var(--brand-700)', label: 'รับพัสดุแล้ว' },
    SHIPPING:  { bg: 'var(--brand-100)', text: 'var(--brand-700)', label: 'กำลังจัดส่ง' },
    DELIVERED: { bg: 'rgba(46, 125, 50, 0.15)', text: 'var(--success-text)', label: 'ส่งสำเร็จ' },
    CANCELLED: { bg: 'var(--error-bg)', text: 'var(--error-text)', label: 'ยกเลิก' },
  };

  const current = styles[status] || { bg: 'var(--n-100)', text: 'var(--n-600)', label: status };

  return (
    <span className="sp-caps" style={{ background: current.bg, color: current.text, padding: '0.375rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem' }}>
      {current.label}
    </span>
  );
}
