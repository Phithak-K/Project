'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Search, Clock, LogOut, ChevronRight, Wallet, User, Shield } from 'lucide-react';

// ─── Skeleton Components ──────────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--n-850) 25%, var(--n-800) 50%, var(--n-850) 75%)',
  backgroundSize: '200% 100%',
  animation: 'sp-shimmer 1.4s ease-in-out infinite',
};

function SkeletonBlock({ width = '100%', height = '16px', style = {} }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return <div style={{ ...shimmerStyle, width, height, ...style }} />;
}

function SkeletonWalletCard() {
  return (
    <div style={{ background: 'var(--n-850)', borderTop: '2px solid var(--n-800)', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <SkeletonBlock width="100px" height="12px" />
        <SkeletonBlock width="160px" height="36px" />
      </div>
      <SkeletonBlock width="130px" height="42px" />
    </div>
  );
}

function SkeletonOrderCard() {
  return (
    <div style={{ background: 'var(--n-850)', borderTop: '2px solid var(--n-800)', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <SkeletonBlock width="40px" height="40px" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonBlock width="140px" height="14px" />
          <SkeletonBlock width="90px" height="12px" />
        </div>
      </div>
      <SkeletonBlock width="80px" height="26px" />
    </div>
  );
}

function SkeletonLoggedIn() {
  return (
    <div className="sp-page-dark">
      <nav className="sp-nav-dark">
        <SkeletonBlock width="140px" height="24px" />
        <SkeletonBlock width="110px" height="36px" />
      </nav>
      <div style={{ padding: '5rem 2rem', borderBottom: '1px solid var(--n-800)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <SkeletonBlock width="200px" height="14px" />
          <SkeletonBlock width="480px" height="52px" style={{ maxWidth: '100%' }} />
          <SkeletonBlock width="600px" height="60px" style={{ marginTop: '0.75rem', maxWidth: '100%' }} />
        </div>
      </div>
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <SkeletonWalletCard />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <SkeletonBlock width="120px" height="18px" />
          <SkeletonBlock width="60px" height="26px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonOrderCard />
          <SkeletonOrderCard />
          <SkeletonOrderCard />
        </div>
      </main>
    </div>
  );
}

function SkeletonGuest() {
  return (
    <div className="sp-page-dark">
      <nav className="sp-nav-dark">
        <SkeletonBlock width="140px" height="24px" />
        <SkeletonBlock width="110px" height="36px" />
      </nav>
      <div style={{ padding: '5rem 2rem', borderBottom: '1px solid var(--n-800)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <SkeletonBlock width="200px" height="14px" />
          <SkeletonBlock width="480px" height="52px" style={{ maxWidth: '100%' }} />
          <SkeletonBlock width="600px" height="60px" style={{ marginTop: '0.75rem', maxWidth: '100%' }} />
        </div>
      </div>
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <SkeletonBlock width="100%" height="220px" />
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
  const [isMounted, setIsMounted] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

  if (!isMounted) {
    return (
      <>
        <style>{`@keyframes sp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <SkeletonGuest />
      </>
    );
  }

  if (isLoading) {
    const hasToken = document.cookie.includes('role=');
    return (
      <>
        <style>{`@keyframes sp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        {hasToken ? <SkeletonLoggedIn /> : <SkeletonGuest />}
      </>
    );
  }

  return (
    <div className="sp-page-dark">
      <style>{`@keyframes sp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {/* Navbar */}
      <nav className="sp-nav-dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo-dark">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
          <span className="sp-caps" style={{ color: 'var(--n-500)', borderLeft: '1px solid var(--n-800)', paddingLeft: '0.75rem' }}>
            Portal
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isLoggedIn ? (
            <>
              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'var(--n-850)', color: 'var(--brand-500)', border: '1px solid var(--brand-900)', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wallet size={16} /> Wallet: ฿{balance?.toLocaleString()}
                </button>
              </Link>
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'var(--n-850)', color: 'var(--n-300)', border: '1px solid var(--n-700)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <User size={16} />
                </button>
              </Link>
              <button onClick={handleLogout} style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-bg)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'transparent', color: 'var(--n-300)', border: '1px solid var(--n-700)', padding: '0.5rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Business Log In
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="sp-animate-d1" style={{ borderBottom: '1px solid var(--n-800)', padding: '6rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>Professional Logistics Network</span>
          <h1 className="sp-font-display sp-text-hero" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            Enterprise Delivery <span style={{ color: 'var(--brand-500)' }}>Simplified</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--n-400)', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.5, fontWeight: 500 }}>
            Real-time multi-carrier orchestration platform with advanced route planning and secure financial settlement.
          </p>

          {/* Search Box */}
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <form onSubmit={handleTrack} style={{ display: 'flex', background: 'var(--n-850)', padding: '0.5rem', border: '1px solid var(--n-700)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, paddingLeft: '1rem' }}>
                <Search size={20} style={{ color: 'var(--brand-500)' }} />
                <input
                  type="text"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="ENTER TRACKING NUMBER"
                  className="sp-input"
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1rem', color: 'var(--n-50)', padding: '0' }}
                />
              </div>
              <button type="submit" className="sp-btn-primary" style={{ padding: '0.875rem 1.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                TRACK PACKAGE
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Conditional Content */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        {isLoggedIn ? (
          <div className="sp-animate-d2">
            {/* Wallet Section */}
            <div style={{ background: 'var(--n-850)', borderTop: '4px solid var(--brand-500)', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
              <div>
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>Available Balance</p>
                <p className="sp-font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--n-50)', marginTop: '0.5rem' }}>
                  ฿{balance !== null ? balance.toLocaleString() : '0'}
                </p>
              </div>
              <Link href="/wallet" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'transparent', color: 'var(--n-300)', border: '1px solid var(--n-700)', padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Manage Wallet
                </button>
              </Link>
            </div>

            {/* Recent Orders Section */}
            <div className="sp-section-divider" style={{ marginBottom: '2rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div>
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>ACTIVE</p>
                <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-50)' }}>Recent Orders</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span className="sp-mono" style={{ color: 'var(--n-400)' }}>[{orders.length}]</span>
                <Link href="/history" style={{ textDecoration: 'none' }}>
                  <button style={{ background: 'transparent', color: 'var(--brand-500)', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    ประวัติย้อนหลัง &rarr;
                  </button>
                </Link>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{ padding: '4rem 0', textAlign: 'center' }}>
                <Clock size={32} style={{ color: 'var(--n-600)', margin: '0 auto 1rem' }} />
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>No orders found</p>
                <p style={{ color: 'var(--n-400)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Orders dispatched to your address will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => (
                  <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'var(--n-850)', borderTop: '2px solid var(--n-800)', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.2s' }}
                         onMouseEnter={e => e.currentTarget.style.background = 'var(--n-800)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'var(--n-850)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ width: '48px', height: '48px', background: 'var(--n-900)', border: '1px solid var(--n-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-500)' }}>
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="sp-mono" style={{ fontWeight: 700, color: 'var(--brand-500)', fontSize: '0.9rem' }}>{order.trackingNumber}</p>
                          <p style={{ color: 'var(--n-50)', fontSize: '0.95rem', marginTop: '0.25rem', fontWeight: 600 }}>{order.productName}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <StatusBadge status={order.status} />
                        <ChevronRight size={18} style={{ color: 'var(--n-500)' }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Logged Out CTA */
          <div className="sp-animate-d2" style={{ background: 'var(--n-850)', borderTop: '4px solid var(--brand-500)', padding: '4rem 2rem', textAlign: 'center' }}>
            <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-50)', marginBottom: '1rem' }}>Manage Shipments Electronically</h2>
            <p style={{ color: 'var(--n-400)', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 2.5rem', lineHeight: 1.6, fontWeight: 500 }}>
              Create an enterprise account or log in to manage active delivery flows, fund your corporate wallet, and track multi-carrier pipelines.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="sp-btn-primary" style={{ padding: '0.875rem 2rem' }}>
                  LOG IN
                </button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'transparent', color: 'var(--n-300)', border: '1px solid var(--n-700)', padding: '0.875rem 2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  REGISTER
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Corporate Footer Links */}
        <div style={{ height: '1px', background: 'var(--n-800)', margin: '4rem 0 2rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <p className="sp-caps" style={{ color: 'var(--n-500)' }}>Join the Network</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href={`//store.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/register`} style={{ textDecoration: 'none' }}>
              <button style={{ background: 'transparent', border: '1px solid var(--n-700)', padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--n-400)', cursor: 'pointer' }}>Merchant Platform</button>
            </a>
            <a href={`//fleet.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/register`} style={{ textDecoration: 'none' }}>
              <button style={{ background: 'transparent', border: '1px solid var(--n-700)', padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--n-400)', cursor: 'pointer' }}>Driver Fleet</button>
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
    PENDING:   { bg: 'var(--brand-900)', text: 'var(--brand-500)', label: 'Pending' },
    ACCEPTED:  { bg: 'oklch(20% 0.05 260)', text: 'oklch(65% 0.15 260)', label: 'Assigned' },
    PICKED_UP: { bg: 'oklch(20% 0.05 260)', text: 'oklch(65% 0.15 260)', label: 'Received' },
    SHIPPING:  { bg: 'oklch(20% 0.05 260)', text: 'oklch(65% 0.15 260)', label: 'Shipping' },
    DELIVERED: { bg: 'oklch(20% 0.06 150)', text: 'oklch(65% 0.15 150)', label: 'Completed' },
    CANCELLED: { bg: 'var(--error-bg)', text: 'var(--error-text)', label: 'Cancelled' },
  };

  const current = styles[status] || { bg: 'var(--n-800)', text: 'var(--n-400)', label: status };

  return (
    <span style={{ background: current.bg, color: current.text, fontSize: '0.7rem', fontWeight: 800, padding: '0.375rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {current.label}
    </span>
  );
}
