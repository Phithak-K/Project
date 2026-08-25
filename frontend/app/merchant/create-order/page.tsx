'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { handleLogout as clearSession } from '@/lib/auth';
import {
  ArrowLeft, Package, User, Phone, MapPin, Plus, Trash2,
  DollarSign, Shield, CloudRain, CheckCircle
} from 'lucide-react';

interface OrderItem {
  productName: string;
  quantity: number | '';   // ✅ อนุญาตให้ว่างชั่วคราวขณะพิมพ์ได้
  unitPrice: number | '';  // ✅ อนุญาตให้ว่างชั่วคราวขณะพิมพ์ได้
  note: string;
  productId?: number;
  isCustom?: boolean;
}

interface Product {
  id: number;
  name: string;
  unit: string;
  defaultPrice: number;
}

const emptyItem = (): OrderItem => ({ productName: '', quantity: '', unitPrice: '', note: '', isCustom: false });

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [weatherChecking, setWeatherChecking] = useState(false);
  const [weatherData, setWeatherData] = useState<{ main: string; surge: number; eta: number } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  const [formData, setFormData] = useState({
    receiverName: '',
    receiverPhone: '',
    address: '',
    city: '',
    lat: '',
    lng: '',
    hasInsurance: false,
  });

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/products/my');
      if (res.status === 401) {
        await clearSession();
        window.location.replace('/login');
        return;
      }
      if (res.ok) setProducts(await res.json());
    } catch { /* catalog is optional */ }
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  // ── Item Management ──
  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number | boolean) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      // ✅ อนุญาตให้ quantity/unitPrice ว่างชั่วคราวขณะพิมพ์ ไม่บังคับเด้งกลับเป็น 1
      return { ...item, [field]: value };
    }));
  };

  // ── Summary ──
  // ✅ ป้องกัน NaN เมื่อช่องว่าง โดยใช้ Number() || 0 แทนการคูณตรงๆ
  const itemsTotal = items.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0);
  const surgeAmount = weatherData?.surge || 0;
  const insuranceFee = formData.hasInsurance ? 50 : 0;
  const grandTotal = itemsTotal + surgeAmount + insuranceFee;

  // ── Weather Check ──
  const checkWeather = async () => {
    if (!formData.city) return alert('กรุณาระบุเมือง/จังหวัดก่อน');
    setWeatherChecking(true);
    try {
      const res = await fetch(`/api/proxy/weather/${encodeURIComponent(formData.city.trim())}`);
      const data = await res.json();
      if (data.weather?.[0]) {
        const main = data.weather[0].main;
        const isRainy = ['Rain', 'Thunderstorm', 'Drizzle'].includes(main);
        const surge = isRainy ? itemsTotal * 0.20 : 0;
        let eta = 30;
        if (formData.lat && formData.lng) {
          const dist = Math.sqrt(Math.pow(parseFloat(formData.lat) - 13.75, 2) + Math.pow(parseFloat(formData.lng) - 100.5, 2)) * 111;
          eta = Math.ceil(dist * 2) + 10 + (isRainy ? 15 : 0);
        }
        setWeatherData({ main, surge, eta });
      }
    } catch { alert('ไม่สามารถดึงข้อมูลสภาพอากาศได้'); }
    finally { setWeatherChecking(false); }
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalidItems = items.filter(i => !i.productName.trim() || (Number(i.unitPrice) || 0) <= 0 || (Number(i.quantity) || 0) <= 0);
    if (invalidItems.length > 0) { alert('กรุณากรอกชื่อสินค้า จำนวน และราคาให้ครบทุกรายการ'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/proxy/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            productName: i.productName,
            quantity: Number(i.quantity) || 1,   // ✅ แปลงเป็นตัวเลขก่อนส่ง API รองรับทศนิยม
            unitPrice: Number(i.unitPrice) || 0,
            note: i.note || undefined,
            productId: i.productId || undefined,
          })),
          receiverName: formData.receiverName,
          receiverPhone: formData.receiverPhone,
          address: formData.address,
          city: formData.city,
          lat: formData.lat ? parseFloat(formData.lat) : undefined,
          lng: formData.lng ? parseFloat(formData.lng) : undefined,
          hasInsurance: formData.hasInsurance,
        })
      });

      if (res.status === 401) {
        await clearSession();
        window.location.replace('/login');
      } else if (res.ok) {
        router.push('/'); // กลับไปหน้า Dashboard ที่มีรายการออเดอร์
      } else {
        const err = await res.json();
        alert(err.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์');
      }
    } catch { alert('Network Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav" style={{ background: '#fff', borderBottom: '1px solid var(--n-200)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--n-500)' }}>
          <ArrowLeft size={16} /> ย้อนกลับ
        </button>
        <span className="sp-logo">Store<span className="sp-logo-accent">Portal</span></span>
        <div style={{ width: '80px' }} />
      </nav>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>สร้างออเดอร์จัดส่ง</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.25rem' }}>เพิ่มรายการสินค้าและข้อมูลผู้รับพัสดุ</p>
        </div>

        <form onSubmit={handleSubmit} className="sp-stagger">

          {/* ── Section 1: รายการสินค้า (Multi-item) ── */}
          <div className="sp-card" style={{ marginBottom: '1.5rem', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="sp-caps" style={{ color: 'var(--n-400)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={14} /> รายการสินค้า
              </h3>
              <button type="button" onClick={addItem} className="sp-btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ position: 'relative', padding: '1.25rem', border: '1px solid var(--n-200)', borderRadius: '12px', background: 'var(--n-50)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="sp-caps" style={{ color: 'var(--n-500)', fontSize: '0.7rem' }}>รายการที่ {idx + 1}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-300)', padding: '0.25rem' }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div className="sp-field">
                      <label className="sp-label">ชื่อสินค้า</label>
                      {item.isCustom ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text" required value={item.productName}
                            onChange={e => updateItem(idx, 'productName', e.target.value)}
                            className="sp-input" placeholder="พิมพ์ชื่อสินค้า..."
                            style={{ flex: 1 }}
                          />
                          <button type="button" onClick={() => updateItem(idx, 'isCustom', false)} className="sp-btn-ghost" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <select
                          className="sp-input"
                          required
                          value={item.productId || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'CUSTOM') {
                              setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, isCustom: true, productId: undefined, productName: '', unitPrice: 0 }));
                            } else if (val) {
                              const p = products.find(prod => prod.id === parseInt(val));
                              if (p) {
                                setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, isCustom: false, productId: p.id, productName: p.name, unitPrice: Number(p.defaultPrice) }));
                              }
                            } else {
                               setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, isCustom: false, productId: undefined, productName: '', unitPrice: 0 }));
                            }
                          }}
                        >
                          <option value="">-- เลือกสินค้าจากแคตตาล็อก --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (฿{Number(p.defaultPrice).toFixed(2)} / {p.unit || 'ชิ้น'})</option>
                          ))}
                          <option value="CUSTOM">+ พิมพ์รายการอื่นเอง (Custom Item)</option>
                        </select>
                      )}
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">
                        จำนวน{item.productId && products.find(p => p.id === item.productId)?.unit ? ` (${products.find(p => p.id === item.productId)?.unit})` : ''}
                      </label>
                      <input
                        type="number" min="0.01" step="any" required
                        value={item.quantity}
                        onChange={e => {
                          const raw = e.target.value;
                          // ✅ อนุญาตให้ว่างได้ขณะพิมพ์ ไม่บังคับเด้งกลับ 1
                          updateItem(idx, 'quantity', raw === '' ? '' : parseFloat(raw));
                        }}
                        onBlur={e => {
                          // ✅ ตอน blur: ถ้ายังว่างหรือ <= 0 ให้แจ้งเตือน
                          const v = parseFloat(e.target.value);
                          if (!v || v <= 0) updateItem(idx, 'quantity', '');
                        }}
                        placeholder="0.5"
                        className="sp-input"
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">ราคา/หน่วย (฿)</label>
                      <input
                        type="number" min="0" step="0.01" required value={item.unitPrice || ''}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="sp-input" placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">หมายเหตุรายการ (ไม่บังคับ)</label>
                    <input
                      type="text" value={item.note}
                      onChange={e => updateItem(idx, 'note', e.target.value)}
                      className="sp-input" placeholder="เช่น ขอสีเทา, พับให้ด้วย"
                    />
                  </div>
                  <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--n-500)' }}>
                    รวม: <strong style={{ color: 'var(--n-800)' }}>฿{((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 2: ข้อมูลผู้รับ ── */}
          <div className="sp-card" style={{ marginBottom: '1.5rem', background: '#fff' }}>
            <h3 className="sp-caps" style={{ color: 'var(--n-400)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={14} /> ข้อมูลผู้รับ
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="sp-field">
                <label className="sp-label">ชื่อผู้รับ</label>
                <input type="text" required value={formData.receiverName}
                  onChange={e => setFormData({ ...formData, receiverName: e.target.value })}
                  className="sp-input" placeholder="ชื่อ-นามสกุล"
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">เบอร์โทรศัพท์</label>
                <input type="tel" required value={formData.receiverPhone}
                  onChange={e => setFormData({ ...formData, receiverPhone: e.target.value })}
                  className="sp-input" placeholder="08XXXXXXXX"
                />
              </div>
            </div>
            <div className="sp-field" style={{ marginBottom: '1rem' }}>
              <label className="sp-label">เมือง / จังหวัด</label>
              <input type="text" required value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="sp-input" placeholder="เช่น Bangkok, Chiang Mai"
              />
            </div>
            <div className="sp-field" style={{ marginBottom: '1rem' }}>
              <label className="sp-label">ที่อยู่จัดส่ง</label>
              <div style={{ position: 'relative' }}>
                <textarea required rows={3} value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="sp-input" style={{ resize: 'none' }}
                  placeholder="เลขที่บ้าน, ถนน, แขวง, เขต, จังหวัด"
                />
                <button type="button" onClick={checkWeather} disabled={weatherChecking}
                  className="sp-btn-ghost"
                  style={{ position: 'absolute', right: '0.75rem', bottom: '0.75rem', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                >
                  {weatherChecking ? 'กำลังเช็ค...' : 'เช็คสภาพอากาศ'}
                </button>
              </div>
            </div>
            <div className="sp-field" style={{ marginBottom: '1rem' }}>
              <label className="sp-label">ดึงพิกัดอัตโนมัติ (Google Maps / LINE)</label>
              <input 
                type="text" 
                placeholder="วางลิงก์ Location ที่ลูกค้าส่งมาที่นี่..." 
                className="sp-input" 
                onChange={(e) => {
                  const link = e.target.value;
                  if (!link) return;
                  const match = link.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/) || link.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                  if (match) {
                    setFormData({ ...formData, lat: match[1], lng: match[2] });
                    e.target.value = '';
                    alert("📍 ดึงพิกัดสำเร็จ!");
                  }
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="sp-field">
                <label className="sp-label">Latitude (ไม่บังคับ)</label>
                <input type="number" step="any" value={formData.lat}
                  onChange={e => setFormData({ ...formData, lat: e.target.value })}
                  className="sp-input" placeholder="13.75..."
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">Longitude (ไม่บังคับ)</label>
                <input type="number" step="any" value={formData.lng}
                  onChange={e => setFormData({ ...formData, lng: e.target.value })}
                  className="sp-input" placeholder="100.5..."
                />
              </div>
            </div>
          </div>

          {/* ── Section 3: Summary ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>

            <div className="sp-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff' }}>
              <h3 className="sp-caps" style={{ color: 'var(--n-400)' }}>บริการเสริม</h3>
              <div className="sp-checkbox">
                <input type="checkbox" id="insure" checked={formData.hasInsurance}
                  onChange={e => setFormData({ ...formData, hasInsurance: e.target.checked })}
                />
                <label htmlFor="insure" className="sp-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={14} style={{ color: 'var(--brand-500)' }} />
                  SwiftPath Insurance (+฿50)
                </label>
              </div>
              {weatherData && (
                <div style={{
                  padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem',
                  background: weatherData.surge > 0 ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: weatherData.surge > 0 ? 'var(--warning-text)' : 'var(--success-text)',
                  display: 'flex', gap: '0.5rem'
                }}>
                  {weatherData.surge > 0 ? <CloudRain size={16} /> : <CheckCircle size={16} />}
                  <div>
                    <span style={{ fontWeight: 700 }}>{weatherData.main}</span>: {weatherData.surge > 0 ? `Surge +฿${weatherData.surge.toFixed(0)}` : 'ไม่มีค่าเพิ่ม'}
                    <div style={{ opacity: 0.8, fontSize: '0.7rem' }}>ETA ≈ {weatherData.eta} นาที</div>
                  </div>
                </div>
              )}
            </div>

            <div className="sp-card" style={{ background: 'var(--n-50)' }}>
              <h3 className="sp-caps" style={{ color: 'var(--n-600)', marginBottom: '1.25rem' }}>สรุปยอดชำระ</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--n-500)' }}>{item.productName || `รายการ ${idx + 1}`} ×{item.quantity}</span>
                    <span style={{ color: 'var(--n-200)' }}>฿{((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ height: '1px', background: 'var(--n-700)', margin: '0.25rem 0' }} />
                {surgeAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--n-500)' }}>Surge ({weatherData?.main})</span>
                    <span style={{ color: 'var(--brand-400)' }}>+฿{surgeAmount.toFixed(0)}</span>
                  </div>
                )}
                {formData.hasInsurance && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--n-500)' }}>ประกันภัย</span>
                    <span style={{ color: 'oklch(65% 0.12 270)' }}>+฿50</span>
                  </div>
                )}
                <div style={{ height: '1px', background: 'var(--n-700)', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="sp-caps" style={{ color: 'var(--n-500)' }}>รวมสุทธิ</span>
                  <span className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--n-900)' }}>
                    ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button id="btn-submit-order" type="submit" disabled={loading} className="sp-btn-touch sp-btn-touch-full">
            {loading ? <span className="sp-spinner" /> : <>ยืนยันและสร้างออเดอร์</>}
          </button>
        </form>
      </main>
    </div>
  );
}
