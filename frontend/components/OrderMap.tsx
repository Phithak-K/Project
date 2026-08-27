'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface OrderMapProps {
  lat: number;
  lng: number;
  label?: string;
  orderId?: string | number;
  trackingNumber?: string;
  driverLat?: number;
  driverLng?: number;
  onLiveStatusChange?: (isLive: boolean) => void;
  height?: string;
}

export default function OrderMap({ 
  lat, 
  lng, 
  label = 'ปลายทาง', 
  orderId, 
  trackingNumber,
  driverLat,
  driverLng,
  onLiveStatusChange,
  height = '280px'
}: OrderMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndLoad = () => {
      let cssLoaded = !!document.getElementById('leaflet-css');
      let jsLoaded = !!document.getElementById('leaflet-js');

      if (!cssLoaded) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!jsLoaded) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setMapReady(true);
        document.head.appendChild(script);
      } else {
        // If JS tag exists, check if L is available
        if ((window as any).L) {
          setMapReady(true);
        } else {
          // Wait for it to load
          const interval = setInterval(() => {
            if ((window as any).L) {
              clearInterval(interval);
              setMapReady(true);
            }
          }, 100);
        }
      }
    };
    
    checkAndLoad();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      // Determine initial center
      const centerLat = driverLat || lat;
      const centerLng = driverLng || lng;

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add Destination Marker
      const destIconHtml = `
        <div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--brand-500); border: 3px solid #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
      `;
      const destIcon = L.divIcon({ html: destIconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 32] });
      
      destMarkerRef.current = L.marker([lat, lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 4px; text-align: center; background: #ffffff; color: #1a1a1a;">
            <strong style="color: #1a1a1a; font-size: 0.9rem;">${label}</strong>
          </div>
        `);

      // Add Driver Marker (if we have initial pos)
      const driverIconHtml = `
        <div style="
          width: 44px; height: 44px; border-radius: 50%;
          background: oklch(65% 0.18 30 / 0.15); border: 2px solid oklch(65% 0.18 30);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
          transition: all 0.3s ease;
        ">
          <span style="font-size: 20px;">🚛</span>
        </div>
      `;
      const driverIcon = L.divIcon({ html: driverIconHtml, className: '', iconSize: [44, 44], iconAnchor: [22, 22] });
      
      if (driverLat && driverLng) {
        driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon })
          .addTo(map);
      } else {
        // [FIX-006] สร้าง marker แต่ซ่อนไว้ก่อน — จะแสดงเมื่อรับพิกัดจริงจาก Socket
        driverMarkerRef.current = L.marker([0, 0], { icon: driverIcon, opacity: 0 });
      }

      // Adjust bounds if both exist and are valid
      if (driverLat && driverLng && (driverLat !== lat || driverLng !== lng)) {
        const bounds = L.latLngBounds([[lat, lng], [driverLat, driverLng]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [mapReady, lat, lng, driverLat, driverLng, label]);

  // Handle Socket
  useEffect(() => {
    if (!orderId && !trackingNumber) return;
    
    const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '');
    let socket: any = null;
    
    async function initSocket() {
      let token = '';
      if (orderId) {
        try {
          const tokenRes = await fetch('/api/auth/token');
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            token = tokenData.token;
          }
        } catch (err) {
          console.warn("Failed to fetch client token for socket", err);
        }
      }

      const socketOptions: any = { transports: ['websocket', 'polling'], withCredentials: true };
      if (token) {
        socketOptions.auth = { token: `Bearer ${token}` };
      }
      
      socket = io(SOCKET_URL, socketOptions);
      socketRef.current = socket;

      socket.on('connect', () => {
        if (trackingNumber) {
          // Public tracking
          socket.emit('subscribe_tracking', { trackingNumber });
        } else if (orderId && token) {
          // Private order room
          socket.emit('join_order', { orderId: Number(orderId) });
        }
      });

      socket.on('location_updated', (data: { lat: number; lng: number; heading?: number }) => {
        if (!driverMarkerRef.current || !mapInstanceRef.current) return;
        const L = (window as any).L;
        
        const newLatLng = L.latLng(data.lat, data.lng);
        
        // Ensure marker is on map
        if (!mapInstanceRef.current.hasLayer(driverMarkerRef.current)) {
          driverMarkerRef.current.addTo(mapInstanceRef.current);
        }
        
        driverMarkerRef.current.setLatLng(newLatLng);
        driverMarkerRef.current.setOpacity(1); // [FIX-006] แสดง marker เมื่อมีพิกัดจริง
        mapInstanceRef.current.panTo(newLatLng, { animate: true, duration: 1 });
        
        if (onLiveStatusChange) onLiveStatusChange(true);
      });

      socket.on('disconnect', () => {
        if (onLiveStatusChange) onLiveStatusChange(false);
      });
    }

    initSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orderId, trackingNumber, onLiveStatusChange]);

  if (!mapReady) {
    return (
      <div className="sp-card" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <span className="sp-spinner sp-spinner-lg" />
        <span className="sp-caps" style={{ color: 'var(--n-400)' }}>กำลังโหลดแผนที่...</span>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--n-150)', position: 'relative', background: '#f4f4f5' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }} />
    </div>
  );
}
