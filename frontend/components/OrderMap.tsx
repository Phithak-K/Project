'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamic import of MapContainer to prevent Next.js SSR "window is not defined" error
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface OrderMapProps {
  lat: number;
  lng: number;
  label?: string;
  orderId?: string | number; // 🆕 Added to identify room
}

export default function OrderMap({ lat, lng, label = 'ปลายทาง', orderId }: OrderMapProps) {
  const [mounted, setMounted] = useState(false);
  const [icon, setIcon] = useState<any>(null);
  const [driverIcon, setDriverIcon] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Leaflet icons need to be imported dynamically on client side as well
    const L = require('leaflet');
    
    // Fix default icon issue with Leaflet in React
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    const customIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const customDriverIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    
    setIcon(customIcon);
    setDriverIcon(customDriverIcon);
    setMounted(true);
  }, []);

  // 🆕 Listen to WebSocket for Driver Location
  useEffect(() => {
    if (!orderId) return;
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    const token = getCookie('token');
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', {
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join_order', { orderId: Number(orderId) });
    });

    socket.on('location_updated', (data: { lat: number, lng: number }) => {
      setDriverPos({ lat: data.lat, lng: data.lng });
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  if (!mounted || !icon) return <div className="h-64 w-full bg-slate-100 flex items-center justify-center rounded-2xl animate-pulse">กำลังโหลดแผนที่...</div>;

  return (
    <div className="h-64 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 z-0">
      <MapContainer 
        center={[lat, lng]} 
        zoom={15} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>
            <div className="font-bold text-slate-800">{label}</div>
            <div className="text-xs text-slate-500">LAT: {lat.toFixed(4)}, LNG: {lng.toFixed(4)}</div>
          </Popup>
        </Marker>
        {driverPos && driverIcon && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
            <Popup>
              <div className="font-bold text-blue-600">ตำแหน่งคนขับปัจจุบัน</div>
              <div className="text-xs text-slate-500">LIVE</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
