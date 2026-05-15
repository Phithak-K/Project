'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Search, Clock, LogOut, ChevronRight, Wallet, User } from 'lucide-react';

// ─── Skeleton Components ──────────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 50%, #f4f4f5 75%)',
  backgroundSize: '200% 100%',
  animation: 'sp-shimmer 1.4s ease-in-out infinite',
  borderRadius: '8px',
};

function SkeletonBlock({
  width = '100%',
  height = '16px',
  style = {},
}: {
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}) {
  return <div style={{ ...shimmerStyle, width, height, ...style }} />;
}

function SkeletonWalletCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: '16px',
        padding: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <SkeletonBlock width="100px" height="12px" />
        <SkeletonBlock width="160px" height="36px" style={{ borderRadius: '6px' }} />
      </div>
      <SkeletonBlock width="130px" height="42px" style={{ borderRadius: '10px' }} />
    </div>
  );
}

function SkeletonOrderCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <SkeletonBlock width="40px" height="40px" style={{ borderRadius: '10px', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonBlock width="140px" height="14px" />
          <SkeletonBlock width="90px" height="12px" />
        </div>
      </div>
      <SkeletonBlock width="80px" height="26px" style={{ borderRadius: '99px' }} />
    </div>
  );
}

function SkeletonLoggedIn() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Skeleton Navbar */}
      <nav style={{ background: '#fff', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7' }}>
        <SkeletonBlock width="140px" height="24px" style={{ borderRadius: '6px' }} />
        <SkeletonBlock width="110px" height="36px" style={{ borderRadius: '8px' }} />
      </nav>
      {/* Skeleton Hero */}
      <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fffbf7 100%)', borderBottom: '1px solid #f5ebe0', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <SkeletonBlock width="200px" height="14px" style={{ borderRadius: '4px' }} />
          <SkeletonBlock width="480px" height="52px" style={{ borderRadius: '8px', maxWidth: '100%' }} />
          <SkeletonBlock width="360px" height="18px" style={{ borderRadius: '4px', maxWidth: '100%' }} />
          <SkeletonBlock width="600px" height="60px" style={{ borderRadius: '16px', marginTop: '0.75rem', maxWidth: '100%' }} />
        </div>
      </div>
      {/* Skeleton Main — Wallet + Orders */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <SkeletonWalletCard />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <SkeletonBlock width="120px" height="18px" />
          <SkeletonBlock width="60px" height="26px" style={{ borderRadius: '99px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SkeletonOrderCard />
          <SkeletonOrderCard />
          <SkeletonOrderCard />
        </div>
      </main>
    </div>
  );
}

// ✅ CRITICAL-02 FIX: Skeleton แยกสำหรับ Guest — ตรงกับ layout จริง ลด CLS
function SkeletonGuest() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <nav style={{ background: '#fff', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7' }}>
        <SkeletonBlock width="140px" height="24px" style={{ borderRadius: '6px' }} />
        <SkeletonBlock width="110px" height="36px" style={{ borderRadius: '8px' }} />
      </nav>
      <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fffbf7 100%)', borderBottom: '1px solid #f5ebe0', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <SkeletonBlock width="200px" height="14px" style={{ borderRadius: '4px' }} />
          <SkeletonBlock width="480px" height="52px" style={{ borderRadius: '8px', maxWidth: '100%' }} />
          <SkeletonBlock width="600px" height="60px" style={{ borderRadius: '16px', marginTop: '0.75rem', maxWidth: '100%' }} />
        </div>
      </div>
      {/* Skeleton Main — CTA box เล็กๆ ตรงกับ Logged-Out UI จริง */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <SkeletonBlock width="100%" height="220px" style={{ borderRadius: '16px' }} />
      </main>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // 🛡️ Hydration Guard

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // ✅ Hydration Guard: รอ Client mount ก่อนเสมอ ป้องกัน SSR/CSR mismatch
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
    // Guard: รันเฉพาะหลัง mount บน client เท่านั้น
    if (!isMounted) return;

    const token = getCookie('token');
    if (!token) {
      setIsLoggedIn(false);
      setIsLoading(false);
      return;
    }
    setIsLoggedIn(true);

    const fetchData = async () => {
      try {
        const [ordersRes, userRes] = await Promise.all([
          fetch(`${API_URL}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (userRes.ok) {
          const userData = await userRes.json();
          setBalance(Number(userData.balance || 0));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isMounted, API_URL]);

  const handleLogout = () => {
    const past = 'Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = `token=; path=/; expires=${past}`;
    document.cookie = `role=; path=/; expires=${past}`;
    document.cookie = `token=; path=/; domain=localhost; expires=${past}`;
    document.cookie = `role=; path=/; domain=localhost; expires=${past}`;
    window.location.href = '/login';
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      router.push(`/track/${trackingInput.trim().toUpperCase()}`);
    }
  };

  // 🛡️ Phase 1: ยังไม่ mount → render nothing (ป้องกัน Hydration mismatch)
  if (!isMounted) return null;

  // 🖴 Phase 2: Mount แล้วแต่กำลังโหลด → ✅ CRITICAL-02: เลือก Skeleton ตาม Auth State ลด CLS
  if (isLoading) {
    const hasToken = document.cookie.includes('token=');
    return (
      <>
        <style>{`
          @keyframes sp-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        {hasToken ? <SkeletonLoggedIn /> : <SkeletonGuest />}
      </>
    );
  }

  // ✅ Phase 3: โหลดเสร็จ → แสดงเนื้อหาจริง
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#18181b', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes sp-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{ background: '#fff', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            Swift<span style={{ color: 'oklch(65% 0.18 30)' }}>Path</span>
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#71717a', borderLeft: '1px solid #e4e4e7', paddingLeft: '0.75rem' }}>
            Portal
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isLoggedIn ? (
            <>
              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'oklch(65% 0.18 30 / 0.1)', color: 'oklch(65% 0.18 30)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wallet size={16} /> Wallet: ฿{balance?.toLocaleString()}
                </button>
              </Link>
              <button onClick={handleLogout} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button style={{ background: '#18181b', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> Business Log In
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fffbf7 100%)', borderBottom: '1px solid #f5ebe0', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'oklch(65% 0.18 30)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Professional Logistics Network</span>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#18181b', letterSpacing: '-0.04em', marginTop: '0.75rem', marginBottom: '1.25rem', lineHeight: 1.1 }}>
            Enterprise Delivery <span style={{ color: 'oklch(65% 0.18 30)' }}>Simplified</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#52525b', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.5, fontWeight: 500 }}>
            Real-time multi-carrier orchestration platform with advanced route planning and secure financial settlement.
          </p>

          {/* Search Box */}
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.5rem', background: '#fff', padding: '0.5rem', borderRadius: '16px', border: '1px solid #e4e4e7', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, paddingLeft: '1rem', color: '#71717a' }}>
                <Search size={20} style={{ color: 'oklch(65% 0.18 30)' }} />
                <input
                  type="text"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Enter tracking number (e.g. SPXXXXXXXX)"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '1rem', color: '#18181b', fontWeight: 600 }}
                />
              </div>
              <button type="submit" style={{ background: 'oklch(65% 0.18 30)', color: '#fff', border: 'none', padding: '0.875rem 1.75rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Track Package
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Conditional Content */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {isLoggedIn ? (
          <div>
            {/* Wallet Section */}
            <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Available Balance</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 900, color: '#18181b', marginTop: '0.375rem', letterSpacing: '-0.02em' }}>
                  ฿{balance !== null ? balance.toLocaleString() : '0'}
                </p>
              </div>
              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <button style={{ background: '#18181b', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                  Manage Wallet
                </button>
              </Link>
            </div>

            {/* Recent Orders Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#18181b' }}>Recent Orders</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', background: '#f4f4f5', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>
                {orders.length} Active
              </span>
            </div>

            {orders.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center' }}>
                <Clock size={32} style={{ color: '#d4d4d8', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#18181b', marginBottom: '0.25rem' }}>No orders found</h3>
                <p style={{ color: '#71717a', fontSize: '0.875rem' }}>Orders dispatched to your address will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {orders.map(order => (
                  <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'oklch(65% 0.18 30 / 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(65% 0.18 30)' }}>
                          <Package size={20} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: '#18181b', fontSize: '0.95rem' }}>{order.trackingNumber}</p>
                          <p style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '0.125rem', fontWeight: 500 }}>{order.productName}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <StatusBadge status={order.status} />
                        <ChevronRight size={16} style={{ color: '#d4d4d8' }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Logged Out CTA */
          <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#18181b', marginBottom: '0.5rem' }}>Manage Shipments Electronically</h2>
            <p style={{ color: '#71717a', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: 1.5, fontWeight: 500 }}>
              Create an enterprise account or log in to manage active delivery flows, fund your corporate wallet, and track multi-carrier pipelines.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'oklch(65% 0.18 30)', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                  Log In
                </button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button style={{ background: '#fff', color: '#18181b', border: '1px solid #d4d4d8', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                  Register
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Corporate Footer Links */}
        <div style={{ height: '1px', background: '#e4e4e7', margin: '4rem 0 2rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Join the Network</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={`//store.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/register`} style={{ textDecoration: 'none' }}>
              <button style={{ background: '#fff', border: '1px solid #d4d4d8', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#52525b', cursor: 'pointer' }}>Merchant Platform</button>
            </a>
            <a href={`//fleet.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/register`} style={{ textDecoration: 'none' }}>
              <button style={{ background: '#fff', border: '1px solid #d4d4d8', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#52525b', cursor: 'pointer' }}>Driver Fleet</button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string, text: string, label: string }> = {
    PENDING:   { bg: '#fef3c7', text: '#d97706', label: 'Pending Approval' },
    ACCEPTED:  { bg: '#e0f2fe', text: '#0284c7', label: 'Assigned' },
    PICKED_UP: { bg: '#faf5ff', text: '#9333ea', label: 'Received' },
    SHIPPING:  { bg: '#ffedd5', text: '#ea580c', label: 'Shipping' },
    DELIVERED: { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
    CANCELLED: { bg: '#fee2e2', text: '#ef4444', label: 'Cancelled' },
  };

  const current = styles[status] || { bg: '#f4f4f5', text: '#71717a', label: status };

  return (
    <span style={{ background: current.bg, color: current.text, fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.75rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
      {current.label}
    </span>
  );
}
