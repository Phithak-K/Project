'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Package, User, Phone, 
  MapPin, CloudRain, AlertTriangle, Plus, DollarSign, Shield, Clock, Navigation, Map, CheckCircle
} from 'lucide-react';

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [weatherChecking, setWeatherChecking] = useState(false);
  const [weatherData, setWeatherData] = useState<{ main: string; surge: number; eta: number | null } | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    price: '',
    quantity: '1',
    receiverName: '',
    receiverPhone: '',
    address: '', 
    city: '',
    lat: '',
    lng: '',
    hasInsurance: false,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const checkWeatherPreview = async () => {
    if (!formData.city) return alert('กรุณาระบุเมือง/จังหวัดเพื่อเช็คสภาพอากาศ');
    setWeatherChecking(true);
    
    try {
      const city = formData.city.trim();
      const res = await fetch(`${API_URL}/weather/${city}`);
      const data = await res.json();
      
      if (data.weather && data.weather[0]) {
        const main = data.weather[0].main;
        const isRainy = main === 'Rain' || main === 'Thunderstorm' || main === 'Drizzle';
        const basePrice = parseFloat(formData.price) || 0;
        const previewSurge = isRainy ? basePrice * 0.20 : 0;
        
        let previewEta = 30;
        if (formData.lat && formData.lng) {
          const dist = Math.sqrt(Math.pow(parseFloat(formData.lat) - 13.75, 2) + Math.pow(parseFloat(formData.lng) - 100.5, 2)) * 111; 
          previewEta = Math.ceil(dist * 2) + 10;
        }
        if (isRainy) previewEta += 15;
        
        setWeatherData({ main, surge: previewSurge, eta: previewEta });
      }
    } catch (err) {
      console.error("Weather check failed");
      alert('ไม่สามารถดึงข้อมูลสภาพอากาศได้ในขณะนี้');
    } finally {
      setWeatherChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = getAuthToken();

    if (!token) {
      alert('เซสชันหมดอายุ กรุณาล็อกอินใหม่');
      router.push('/login');
      return;
    }

    try {
      const basePrice = parseFloat(formData.price) || 0;
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          price: basePrice, 
          quantity: parseInt(formData.quantity),
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
        })
      });

      if (res.ok) {
        router.push('/merchant'); 
      } else {
        const err = await res.json();
        alert(err.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์');
      }
    } catch (error) {
      alert('Network Error: ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = (parseFloat(formData.price) || 0) + (weatherData?.surge || 0) + (formData.hasInsurance ? 50 : 0);

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.back()} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> ย้อนกลับ
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ width: '80px' }} />
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>สร้างออเดอร์จัดส่ง</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.25rem' }}>กรอกข้อมูลพัสดุและผู้รับเพื่อเรียกคนขับ</p>
        </div>

        <form onSubmit={handleSubmit} className="sp-stagger">
          
          {/* Section 1: Item Details */}
          <div className="sp-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={14} /> ข้อมูลสินค้า
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="sp-field">
                <label className="sp-label">ชื่อสินค้า</label>
                <input 
                  type="text" required value={formData.productName} 
                  onChange={e => setFormData({...formData, productName: e.target.value})}
                  className="sp-input" placeholder="เช่น กล่องรองเท้า, เสื้อผ้า"
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">ราคาฐาน (บาท)</label>
                <input 
                  type="number" required value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="sp-input" placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Receiver Info */}
          <div className="sp-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={14} /> ข้อมูลผู้รับ
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="sp-field">
                <label className="sp-label">ชื่อผู้รับ</label>
                <input id="receiver-name"
                  type="text" required value={formData.receiverName}
                  onChange={e => setFormData({...formData, receiverName: e.target.value})}
                  className="sp-input" placeholder="ชื่อ-นามสกุล"
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">เบอร์โทรศัพท์</label>
                <input id="receiver-phone"
                  type="tel" required value={formData.receiverPhone}
                  onChange={e => setFormData({...formData, receiverPhone: e.target.value})}
                  className="sp-input" placeholder="08XXXXXXXX"
                />
              </div>
            </div>

            <div className="sp-field" style={{ marginBottom: '1rem' }}>
              <label className="sp-label">เมือง / จังหวัด</label>
              <input id="receiver-city"
                type="text" required value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="sp-input" placeholder="เช่น Bangkok, Chiang Mai, Pattaya"
              />
            </div>

            <div className="sp-field" style={{ marginBottom: '1rem' }}>
              <label className="sp-label">ที่อยู่จัดส่ง</label>
              <div style={{ position: 'relative' }}>
                <textarea 
                  required rows={3} value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="sp-input" style={{ resize: 'none' }}
                  placeholder="เลขที่บ้าน, ถนน, แขวง, เขต, จังหวัด"
                />
                <button 
                  type="button" onClick={checkWeatherPreview} disabled={weatherChecking}
                  className="sp-btn-ghost" 
                  style={{ position: 'absolute', right: '0.75rem', bottom: '0.75rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  {weatherChecking ? 'กำลังเช็ค...' : 'เช็คสภาพอากาศ & ETA'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="sp-field">
                <label className="sp-label">Latitude</label>
                <input 
                  type="number" step="any" value={formData.lat}
                  onChange={e => setFormData({...formData, lat: e.target.value})}
                  className="sp-input" placeholder="13.75..."
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">Longitude</label>
                <input 
                  type="number" step="any" value={formData.lng}
                  onChange={e => setFormData({...formData, lng: e.target.value})}
                  className="sp-input" placeholder="100.5..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Value Add & Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            <div className="sp-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1rem' }}>บริการเสริม</h3>
                <div className="sp-checkbox">
                  <input 
                    type="checkbox" id="insure" checked={formData.hasInsurance}
                    onChange={e => setFormData({...formData, hasInsurance: e.target.checked})}
                  />
                  <label htmlFor="insure" className="sp-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={14} style={{ color: 'var(--brand-500)' }} />
                    SwiftPath Insurance (+฿50)
                  </label>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: '0.5rem', marginLeft: '1.6rem' }}>
                  คุ้มครองสินค้าเสียหายสูงสุด 5,000 บาท
                </p>
              </div>

              {weatherData && (
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', borderRadius: '0.5rem', background: weatherData.surge > 0 ? 'var(--warning-bg)' : 'var(--success-bg)', color: weatherData.surge > 0 ? 'var(--warning-text)' : 'var(--success-text)', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                  {weatherData.surge > 0 ? <CloudRain size={16} /> : <CheckCircle size={16} />}
                  <div>
                    <span style={{ fontWeight: 700 }}>{weatherData.main}</span>: {weatherData.surge > 0 ? `Surge +฿${weatherData.surge}` : 'ไม่มีค่าบริการเพิ่ม'}
                    <div style={{ opacity: 0.8, fontSize: '0.7rem' }}>ETA ประมาณ {weatherData.eta} นาที</div>
                  </div>
                </div>
              )}
            </div>

            <div className="sp-card-dark" style={{ background: 'var(--n-850)' }}>
              <h3 className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1.5rem' }}>สรุปยอดชำระ</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--n-500)' }}>ราคาสินค้า</span>
                  <span style={{ color: 'var(--n-50)' }}>฿{(parseFloat(formData.price) || 0).toLocaleString()}</span>
                </div>
                {weatherData && weatherData.surge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--n-500)' }}>ค่า Surge ({weatherData.main})</span>
                    <span style={{ color: 'var(--brand-400)' }}>+ ฿{weatherData.surge.toLocaleString()}</span>
                  </div>
                )}
                {formData.hasInsurance && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--n-500)' }}>ค่าประกันภัย</span>
                    <span style={{ color: 'oklch(65% 0.12 270)' }}>+ ฿50</span>
                  </div>
                )}
                <div style={{ height: '1px', background: 'var(--n-800)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="sp-caps" style={{ color: 'var(--n-500)' }}>รวมสุทธิ</span>
                  <span className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-50)' }}>
                    ฿{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

          </div>

          <button id="btn-submit" type="submit" disabled={loading} className="sp-btn-brand sp-btn-full" style={{ padding: '1.125rem', fontSize: '1.1rem' }}>
            {loading ? <span className="sp-spinner" /> : <>ยืนยันและสร้างออเดอร์</>}
          </button>

        </form>

      </main>
    </div>
  );
}