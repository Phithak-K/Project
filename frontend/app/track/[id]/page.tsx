'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, Clock, MapPin, Truck, CheckCircle, AlertTriangle, ArrowLeft, Search } from 'lucide-react';
import OrderMap from '@/components/OrderMap';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { PENDING: 'sp-badge sp-badge-pending', ACCEPTED: 'sp-badge sp-badge-accepted', PICKED_UP: 'sp-badge sp-badge-picked', SHIPPING: 'sp-badge sp-badge-shipping', DELIVERED: 'sp-badge sp-badge-delivered', CANCELLED: 'sp-badge sp-badge-cancelled' };
  return <span className={map[status] || 'sp-badge sp-badge-pending'}>{status}</span>;
}

export default function TrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trackingNumber = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);

  // [FIX-003] ใช้ Next.js API Proxy แทน Direct URL เพื่อป้องกัน CORS บน Production

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/proxy/orders/track/${trackingNumber}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || 'Tracking number not found');
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setError('Network error. Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    };
    
    if (trackingNumber) {
      fetchOrder();
    }
  }, [trackingNumber]);

  if (loading) {
    return (
      <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sp-spinner sp-spinner-lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="sp-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--error-bg)', color: 'var(--error-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <AlertTriangle size={32} />
        </div>
        <h1 className="sp-font-display sp-text-lg" style={{ color: 'var(--n-900)' }}>{error || 'Order Not Found'}</h1>
        <p style={{ color: 'var(--n-500)', marginBottom: '2rem', textAlign: 'center' }}>The tracking number you entered might be incorrect or does not exist.</p>
        <button onClick={() => router.push('/')} className="sp-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}>
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    );
  }

  const statuses = [
    { key: 'PENDING', label: 'Order Placed', icon: Package },
    { key: 'ACCEPTED', label: 'Driver Assigned', icon: CheckCircle },
    { key: 'PICKED_UP', label: 'Picked Up', icon: Package },
    { key: 'SHIPPING', label: 'Out for Delivery', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: MapPin },
  ];

  const currentStatusIndex = statuses.findIndex(s => s.key === order.status) >= 0 
    ? statuses.findIndex(s => s.key === order.status) 
    : (order.status === 'CANCELLED' ? -1 : 0);

  return (
    <div className="sp-page">
      {/* Nav */}
      <nav className="sp-nav" style={{ background: '#fff', borderBottom: '1px solid var(--n-200)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
        </div>
        <button onClick={() => router.push('/')} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
          <Search size={16} /> กลับหน้าหลัก
        </button>
      </nav>

      <main className="sp-container" style={{ maxWidth: '800px', paddingTop: '2rem', paddingBottom: '3rem' }}>
        
        {/* Header Section */}
        <div className="sp-card sp-animate" style={{ padding: '2rem', marginBottom: '1.5rem', background: '#fff' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '0.25rem' }}>Tracking Number</p>
              <h1 className="sp-font-display sp-text-xl" style={{ fontWeight: 900, color: 'var(--n-900)' }}>{order.trackingNumber}</h1>
              <p style={{ color: 'var(--n-600)', fontWeight: 600, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={16} /> {order.productName}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
               <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Progress Bar */}
          {order.status !== 'CANCELLED' && (
            <div style={{ marginTop: '2.5rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', height: '2px', background: 'var(--n-100)', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: '24px', left: '24px', width: `${(Math.max(0, currentStatusIndex) / (statuses.length - 1)) * 100}%`, height: '2px', background: 'var(--brand-500)', transition: 'width 0.5s ease', zIndex: 1 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                {statuses.map((step, index) => {
                  const isActive = index <= currentStatusIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '80px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isActive ? 'var(--brand-500)' : '#fff', border: isActive ? 'none' : '2px solid var(--n-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : 'var(--n-400)', transition: 'all 0.3s' }}>
                        <Icon size={20} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? 'var(--n-900)' : 'var(--n-400)', textAlign: 'center', lineHeight: 1.2 }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weather & ETA Alerts */}
          {(order.weatherWarning || (order.estimatedMinutes && order.status !== 'DELIVERED' && order.status !== 'CANCELLED')) && (
            <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {order.estimatedMinutes && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--n-50)', borderRadius: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--n-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--n-600)' }}><Clock size={18} /></div>
                  <div>
                    <p className="sp-caps" style={{ color: 'var(--n-500)' }}>Estimated Time</p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--n-900)' }}>ประมาณ {order.estimatedMinutes} นาที</p>
                  </div>
                </div>
              )}
              {order.weatherWarning && (
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--error-bg)', borderRadius: '12px', border: '1px solid rgba(255,0,0,0.1)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error-text)' }}><AlertTriangle size={18} /></div>
                  <div>
                    <p className="sp-caps" style={{ color: 'var(--error-text)' }}>Weather Update</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--error-text)', lineHeight: 1.3 }}>{order.weatherWarning}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Map Section */}
          <div className="sp-card sp-stagger" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} style={{ color: 'var(--brand-500)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--n-900)' }}>Live Location</h2>
              </div>
              {/* [REALTIME-FIX] แสดงสัญญาณ Live เมื่อรับพิกัดจากคนขับ */}
              {isLive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', background: '#dcfce7', borderRadius: '99px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d' }}>LIVE</span>
                </div>
              )}
            </div>
            <div style={{ height: '300px', width: '100%', position: 'relative', background: 'var(--n-50)' }}>
              <OrderMap 
                lat={order.lat || 13.7563} 
                lng={order.lng || 100.5018} 
                label={order.address || 'ปลายทาง'} 
                trackingNumber={order.trackingNumber}
                onLiveStatusChange={setIsLive}
                height="300px"
              />
            </div>
            {order.driver && (
              <div style={{ padding: '1rem 1.5rem', background: 'var(--n-50)', borderTop: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--n-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--n-600)' }}>
                  {order.driver.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--n-900)' }}>{order.driver.name || 'SwiftPath Driver'}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--n-500)' }}>{order.driver.vehiclePlate || 'Vehicle'} • {order.driver.vehicleType || 'Standard'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div className="sp-card sp-stagger" style={{ padding: '1.5rem', background: '#fff', animationDelay: '100ms' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--n-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--brand-500)' }} /> Tracking History
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {order.trackingLogs?.length === 0 ? (
                <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No tracking history available yet.</p>
              ) : (
                order.trackingLogs?.map((log: any, index: number) => {
                  const isLatest = index === 0;
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '1rem', position: 'relative', paddingBottom: index === order.trackingLogs.length - 1 ? '0' : '1.5rem' }}>
                      {/* Vertical Line */}
                      {index !== order.trackingLogs.length - 1 && (
                        <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '0', width: '2px', background: 'var(--n-200)', zIndex: 0 }} />
                      )}
                      {/* Dot */}
                      <div style={{ position: 'relative', zIndex: 1, marginTop: '4px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: isLatest ? 'var(--brand-500)' : 'var(--n-200)', border: '3px solid #fff', boxShadow: '0 0 0 1px var(--n-200)' }} />
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, background: isLatest ? 'var(--n-50)' : 'transparent', padding: isLatest ? '0.75rem 1rem' : '0', borderRadius: '8px', border: isLatest ? '1px solid var(--n-200)' : 'none', marginTop: isLatest ? '-8px' : '0' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: isLatest ? 'var(--n-900)' : 'var(--n-500)', marginBottom: '0.25rem' }}>{log.note}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--n-400)' }}>
                          <span>{new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          {log.location && (
                            <>
                              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--n-300)' }} />
                              <span>{log.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
