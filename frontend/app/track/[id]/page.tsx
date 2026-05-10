'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, Clock, MapPin, Truck, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function TrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trackingNumber = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/track/${trackingNumber}`);
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
  }, [trackingNumber, API_URL]);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current || !order) return;
    
    const L = (window as any).L;
    if (!L) return;

    // Determine location: Latest log with lat/lng OR destination lat/lng OR Bangkok default
    let centerLat = 13.7563;
    let centerLng = 100.5018;
    
    const logWithLocation = order.trackingLogs?.find((l: any) => l.lat && l.lng);
    if (logWithLocation) {
      centerLat = logWithLocation.lat;
      centerLng = logWithLocation.lng;
    } else if (order.lat && order.lng) {
      centerLat = order.lat;
      centerLng = order.lng;
    }

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add marker
    const iconHtml = `
      <div style="
        width: 40px; height: 40px; border-radius: 50%;
        background: oklch(65% 0.18 30 / 0.15); border: 2px solid oklch(65% 0.18 30);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
      ">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: oklch(65% 0.18 30);"></div>
      </div>
    `;
    const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
    
    markerRef.current = L.marker([centerLat, centerLng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: 'Inter', sans-serif; padding: 4px; text-align: center;">
          <strong style="color: oklch(65% 0.18 30); font-size: 0.9rem;">SwiftPath Delivery</strong><br/>
          <span style="font-size: 0.8rem; color: #52525b;">Latest Known Location</span>
        </div>
      `);
      
    // Re-center map slightly higher so popup fits
    map.panBy([0, -50]);

  }, [mapReady, order]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e4e4e7', borderTopColor: 'oklch(65% 0.18 30)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <AlertTriangle size={32} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#18181b', marginBottom: '0.5rem' }}>{error || 'Order Not Found'}</h1>
        <p style={{ color: '#71717a', marginBottom: '2rem', textAlign: 'center' }}>The tracking number you entered might be incorrect or does not exist.</p>
        <button onClick={() => router.push('/track')} style={{ background: '#18181b', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back to Search
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
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#18181b', fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: '#fff', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            Swift<span style={{ color: 'oklch(65% 0.18 30)' }}>Path</span>
          </span>
        </div>
        <button onClick={() => router.push('/track')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#52525b', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          <Search size={16} /> New Search
        </button>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header Section */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', border: '1px solid #e4e4e7', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tracking Number</p>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#18181b', letterSpacing: '-0.02em' }}>{order.trackingNumber}</h1>
              <p style={{ color: '#52525b', fontWeight: 500, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={16} /> {order.productName}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', padding: '0.5rem 1rem', background: order.status === 'CANCELLED' ? '#fee2e2' : 'oklch(65% 0.18 30 / 0.1)', color: order.status === 'CANCELLED' ? '#ef4444' : 'oklch(65% 0.18 30)', borderRadius: '99px', fontWeight: 800, fontSize: '0.875rem', letterSpacing: '0.05em' }}>
                {order.status}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {order.status !== 'CANCELLED' && (
            <div style={{ marginTop: '2.5rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', height: '2px', background: '#f4f4f5', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: '24px', left: '24px', width: `${(Math.max(0, currentStatusIndex) / (statuses.length - 1)) * 100}%`, height: '2px', background: 'oklch(65% 0.18 30)', transition: 'width 0.5s ease', zIndex: 1 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                {statuses.map((step, index) => {
                  const isActive = index <= currentStatusIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '80px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isActive ? 'oklch(65% 0.18 30)' : '#fff', border: isActive ? 'none' : '2px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : '#a1a1aa', transition: 'all 0.3s' }}>
                        <Icon size={20} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? '#18181b' : '#a1a1aa', textAlign: 'center', lineHeight: 1.2 }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weather & ETA Alerts */}
          {(order.weatherWarning || order.estimatedMinutes) && (
            <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {order.estimatedMinutes && (
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#f4f4f5', borderRadius: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}><Clock size={18} /></div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Estimated Time</p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#18181b' }}>~{order.estimatedMinutes} Mins</p>
                  </div>
                </div>
              )}
              {order.weatherWarning && (
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}><AlertTriangle size={18} /></div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>Weather Update</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9a3412', lineHeight: 1.3 }}>{order.weatherWarning}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Map Section */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e4e4e7', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} style={{ color: 'oklch(65% 0.18 30)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#18181b' }}>Live Location</h2>
            </div>
            <div style={{ height: '300px', width: '100%', position: 'relative', background: '#f4f4f5' }}>
              <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
              {!mapReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: '30px', height: '30px', border: '2px solid #d4d4d8', borderTopColor: 'oklch(65% 0.18 30)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
            {order.driver && (
              <div style={{ padding: '1rem 1.5rem', background: '#fafafa', borderTop: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#71717a' }}>
                  {order.driver.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#18181b' }}>{order.driver.name || 'SwiftPath Driver'}</p>
                  <p style={{ fontSize: '0.8rem', color: '#71717a' }}>{order.driver.vehiclePlate || 'Vehicle'} • {order.driver.vehicleType || 'Standard'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e4e4e7', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#18181b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'oklch(65% 0.18 30)' }} /> Tracking History
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {order.trackingLogs?.length === 0 ? (
                <p style={{ color: '#71717a', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No tracking history available yet.</p>
              ) : (
                order.trackingLogs?.map((log: any, index: number) => {
                  const isLatest = index === 0;
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '1rem', position: 'relative', paddingBottom: index === order.trackingLogs.length - 1 ? '0' : '1.5rem' }}>
                      {/* Vertical Line */}
                      {index !== order.trackingLogs.length - 1 && (
                        <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '0', width: '2px', background: '#e4e4e7', zIndex: 0 }} />
                      )}
                      {/* Dot */}
                      <div style={{ position: 'relative', zIndex: 1, marginTop: '4px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: isLatest ? 'oklch(65% 0.18 30)' : '#e4e4e7', border: '3px solid #fff', boxShadow: '0 0 0 1px #e4e4e7' }} />
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, background: isLatest ? '#fafafa' : 'transparent', padding: isLatest ? '0.75rem 1rem' : '0', borderRadius: '8px', border: isLatest ? '1px solid #e4e4e7' : 'none', marginTop: isLatest ? '-8px' : '0' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: isLatest ? '#18181b' : '#52525b', marginBottom: '0.25rem' }}>{log.note}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                          <span>{new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          {log.location && (
                            <>
                              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#d4d4d8' }} />
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
