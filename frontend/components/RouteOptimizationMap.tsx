'use client';

import { useEffect, useState, useRef } from 'react';
import { Crosshair } from 'lucide-react';

export interface OptimizedStopItem {
  step: number;
  orderId: number;
  trackingNumber: string;
  receiverName: string;
  receiverPhone: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  legDistanceKm: number;
  cumulativeDistanceKm: number;
  estimatedMinutesFromPrev: number;
}

interface RouteOptimizationMapProps {
  origin: { lat: number; lng: number } | null;
  originType?: 'DRIVER_GPS' | 'FIRST_ORDER' | 'NONE';
  stops: OptimizedStopItem[];
  height?: string;
}

export default function RouteOptimizationMap({
  origin,
  originType = 'DRIVER_GPS',
  stops,
  height = '380px',
}: RouteOptimizationMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const boundsRef = useRef<any>(null);
  const singlePointRef = useRef<[number, number] | null>(null);

  // Sync with Driver Night Mode (html.driver-dark)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkDark = () => setIsDark(document.documentElement.classList.contains('driver-dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load Leaflet dynamically (matching project standards)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndLoad = () => {
      const cssLoaded = !!document.getElementById('leaflet-css');
      const jsLoaded = !!document.getElementById('leaflet-js');

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
        if ((window as any).L) {
          setMapReady(true);
        } else {
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

  // Render or Update Map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Destroy previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter = origin
      ? [origin.lat, origin.lng]
      : stops.length > 0
      ? [stops[0].lat, stops[0].lng]
      : [13.7563, 100.5018]; // Bangkok fallback

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(defaultCenter, 13);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileAttribution = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    L.tileLayer(tileUrl, {
      attribution: tileAttribution,
      maxZoom: 19,
    }).addTo(map);

    const latLngPoints: [number, number][] = [];

    // 1. Origin Marker
    if (origin) {
      latLngPoints.push([origin.lat, origin.lng]);
      const originIconHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(34, 197, 94, 0.3); animation: pulse 2s infinite;"></div>
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #16a34a; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold;">
            📍
          </div>
        </div>
      `;
      const originIcon = L.divIcon({
        html: originIconHtml,
        className: 'origin-marker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([origin.lat, origin.lng], { icon: originIcon })
        .addTo(map)
        .bindPopup(
          `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #111;">
            <b style="color: #16a34a; font-size: 13px;">จุดเริ่มต้นการเดินทาง</b><br/>
            <span>ประเภท: ${originType === 'DRIVER_GPS' ? 'พิกัด GPS ของคุณ' : 'พิกัดจุดแรก'}</span><br/>
            <span style="color: #666;">ละติจูด: ${origin.lat.toFixed(4)}, ลองจิจูด: ${origin.lng.toFixed(4)}</span>
          </div>
        `,
        );
    }

    // 2. Numbered Delivery Stops Markers
    stops.forEach((stop) => {
      latLngPoints.push([stop.lat, stop.lng]);

      const stopIconHtml = `
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #f25a19; border: 2.5px solid white; box-shadow: 0 3px 10px rgba(242, 90, 25, 0.45); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px; font-family: sans-serif;">
          ${stop.step}
        </div>
      `;

      const stopIcon = L.divIcon({
        html: stopIconHtml,
        className: `stop-marker-${stop.step}`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([stop.lat, stop.lng], { icon: stopIcon })
        .addTo(map)
        .bindPopup(
          `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.5; color: #111; min-width: 170px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="background: #f25a19; color: white; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                จุดที่ ${stop.step}
              </span>
              <span style="color: #666; font-size: 10px; font-weight: bold;">${stop.trackingNumber}</span>
            </div>
            <b style="font-size: 13px; color: #000;">${stop.receiverName}</b><br/>
            <span style="color: #444;">${stop.address}</span><br/>
            <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;" />
            <div style="display: flex; justify-content: space-between; color: #666; font-size: 11px;">
              <span>ระยะทางจากจุดก่อน:</span>
              <b style="color: #f25a19;">+${stop.legDistanceKm} กม.</b>
            </div>
            <div style="display: flex; justify-content: space-between; color: #666; font-size: 11px;">
              <span>เวลาประมาณการ:</span>
              <b>~${stop.estimatedMinutesFromPrev} นาที</b>
            </div>
          </div>
        `,
        );
    });

    // 3. Draw Connecting Route Polyline
    if (latLngPoints.length > 1) {
      // Glow underlay line
      L.polyline(latLngPoints, {
        color: '#f97316',
        weight: 6,
        opacity: 0.35,
      }).addTo(map);

      // Main route polyline
      L.polyline(latLngPoints, {
        color: '#ea580c',
        weight: 4,
        opacity: 0.9,
        dashArray: '6, 8',
      }).addTo(map);

      // Fit map to view all points with comfortable padding
      const bounds = L.latLngBounds(latLngPoints);
      boundsRef.current = bounds;
      singlePointRef.current = null;
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (latLngPoints.length === 1) {
      boundsRef.current = null;
      singlePointRef.current = latLngPoints[0];
      map.setView(latLngPoints[0], 14);
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady, origin, originType, stops, isDark]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (boundsRef.current) {
      map.fitBounds(boundsRef.current, { padding: [50, 50], maxZoom: 16, animate: true });
    } else if (singlePointRef.current) {
      map.setView(singlePointRef.current, 14, { animate: true });
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--n-200, #e5e7eb)',
        background: 'var(--n-50, #f8fafc)',
      }}
    >
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {mapReady && (origin || stops.length > 0) && (
        <button
          type="button"
          onClick={handleRecenter}
          title="จัดกึ่งกลางเส้นทางทั้งหมด"
          aria-label="จัดกึ่งกลางเส้นทางทั้งหมด"
          className="absolute top-3 right-3 z-[850] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-md border border-[var(--n-200)] bg-[var(--n-50)] text-[var(--n-900)] hover:border-[var(--brand-500)] transition-colors cursor-pointer"
        >
          <Crosshair size={14} className="text-[var(--brand-500)]" />
          <span>ดูภาพรวม</span>
        </button>
      )}

      {!mapReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--n-50, rgba(255,255,255,0.85))',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--n-200, #e2e8f0)',
                borderTopColor: '#f25a19',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--n-500, #64748b)', marginTop: '8px', fontWeight: 600 }}>
              กำลังโหลดแผนที่เส้นทาง...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

