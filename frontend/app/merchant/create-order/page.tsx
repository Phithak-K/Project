'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { handleLogout as clearSession } from '@/lib/auth';
import {
  ArrowLeft, Package, User, Phone, MapPin, Plus, Trash2,
  DollarSign, Shield, CloudRain, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    } catch (e) { console.warn('Failed to load catalog (optional)', e); }
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
    if (!formData.city) return toast.error('กรุณาระบุเมือง/จังหวัดก่อน');
    setWeatherChecking(true);
    try {
      const res = await fetch(`/api/proxy/weather/${encodeURIComponent(formData.city.trim())}`);
      if (!res.ok) throw new Error('weather proxy err');
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
    } catch { toast.error('ไม่สามารถดึงข้อมูลสภาพอากาศได้'); }
    finally { setWeatherChecking(false); }
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalidItems = items.filter(i => !i.productName.trim() || (Number(i.unitPrice) || 0) <= 0 || (Number(i.quantity) || 0) <= 0);
    if (invalidItems.length > 0) { toast.error('กรุณากรอกชื่อสินค้า จำนวน และราคาให้ครบทุกรายการ'); return; }

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
        toast.success('สร้างออเดอร์สำเร็จ!', { duration: 3000 });
        router.push('/'); // กลับไปหน้า Dashboard ที่มีรายการออเดอร์
      } else {
        const err = await res.json();
        toast.error(err.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์');
      }
    } catch { toast.error('Network Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="sp-page">
      <nav className="sp-nav bg-white border-b border-[var(--n-200)] sticky top-0 z-10">
        <button onClick={() => router.back()} className="sp-link-muted flex items-center gap-2 bg-transparent border-none text-sm cursor-pointer text-[var(--n-500)]">
          <ArrowLeft size={16} /> ย้อนกลับ
        </button>
        <span className="sp-logo">Store<span className="sp-logo-accent">Portal</span></span>
        <div className="w-20" />
      </nav>

      <main className="max-w-[860px] mx-auto py-10 px-6">
        <div className="sp-animate mb-10">
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg font-black">สร้างออเดอร์จัดส่ง</h1>
          <p className="text-[var(--n-500)] mt-1">เพิ่มรายการสินค้าและข้อมูลผู้รับพัสดุ</p>
        </div>

        <form onSubmit={handleSubmit} className="sp-stagger">

          {/* ── Section 1: รายการสินค้า (Multi-item) ── */}
          <div className="sp-card mb-6 bg-white">
            <div className="flex justify-between items-center mb-5">
              <h3 className="sp-caps text-[var(--n-400)] flex items-center gap-2">
                <Package size={14} /> รายการสินค้า
              </h3>
              <button type="button" onClick={addItem} className="sp-btn-ghost text-[0.8rem] py-1.5 px-3">
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {items.map((item, idx) => (
                <div key={idx} className="relative p-5 border border-[var(--n-200)] rounded-xl bg-[var(--n-50)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="sp-caps text-[var(--n-500)] text-[0.7rem]">รายการที่ {idx + 1}</span>
                    <div className="flex gap-2 items-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="bg-transparent border-none cursor-pointer text-[var(--n-300)] p-1">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 mb-2">
                    <div className="sp-field">
                      <label className="sp-label">ชื่อสินค้า</label>
                      {item.isCustom ? (
                        <div className="flex gap-2">
                          <input
                            type="text" required value={item.productName}
                            onChange={e => updateItem(idx, 'productName', e.target.value)}
                            className="sp-input flex-1" placeholder="พิมพ์ชื่อสินค้า..."
                          />
                          <button type="button" onClick={() => updateItem(idx, 'isCustom', false)} className="sp-btn-ghost p-2 text-[0.8rem]">
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
                  <div className="mt-2 text-right text-[0.8rem] text-[var(--n-500)]">
                    รวม: <strong className="text-[var(--n-800)]">฿{((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 2: ข้อมูลผู้รับ ── */}
          <div className="sp-card mb-6 bg-white">
            <h3 className="sp-caps text-[var(--n-400)] mb-5 flex items-center gap-2">
              <User size={14} /> ข้อมูลผู้รับ
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
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
            <div className="sp-field mb-4">
              <label className="sp-label">เมือง / จังหวัด</label>
              <input type="text" required value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="sp-input" placeholder="เช่น Bangkok, Chiang Mai"
              />
            </div>
            <div className="sp-field mb-4">
              <label className="sp-label">ที่อยู่จัดส่ง</label>
              <div className="relative">
                <textarea required rows={3} value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="sp-input resize-none"
                  placeholder="เลขที่บ้าน, ถนน, แขวง, เขต, จังหวัด"
                />
                <button type="button" onClick={checkWeather} disabled={weatherChecking}
                  className="sp-btn-ghost absolute right-3 bottom-3 py-1 px-2.5 text-[0.7rem]"
                >
                  {weatherChecking ? 'กำลังเช็ค...' : 'เช็คสภาพอากาศ'}
                </button>
              </div>
            </div>
            <div className="sp-field mb-4">
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
                    toast.success("ดึงพิกัดสำเร็จ!", { icon: '📍' });
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-6 mb-10">

            <div className="sp-card flex flex-col gap-4 bg-white">
              <h3 className="sp-caps text-[var(--n-400)]">บริการเสริม</h3>
              <div className="sp-checkbox">
                <input type="checkbox" id="insure" checked={formData.hasInsurance}
                  onChange={e => setFormData({ ...formData, hasInsurance: e.target.checked })}
                />
                <label htmlFor="insure" className="sp-checkbox-label flex items-center gap-2">
                  <Shield size={14} className="text-[var(--brand-500)]" />
                  SwiftPath Insurance (+฿50)
                </label>
              </div>
              {weatherData && (
                <div className={`p-3 rounded-lg text-[0.8rem] flex gap-2 ${weatherData.surge > 0 ? 'bg-[var(--warning-bg)] text-[var(--warning-text)]' : 'bg-[var(--success-bg)] text-[var(--success-text)]'}`}>
                  {weatherData.surge > 0 ? <CloudRain size={16} /> : <CheckCircle size={16} />}
                  <div>
                    <span className="font-bold">{weatherData.main}</span>: {weatherData.surge > 0 ? `Surge +฿${weatherData.surge.toFixed(0)}` : 'ไม่มีค่าเพิ่ม'}
                    <div className="opacity-80 text-[0.7rem]">ETA ≈ {weatherData.eta} นาที</div>
                  </div>
                </div>
              )}
            </div>

            <div className="sp-card bg-[var(--n-50)]">
              <h3 className="sp-caps text-[var(--n-600)] mb-5">สรุปยอดชำระ</h3>
              <div className="flex flex-col gap-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[0.8rem]">
                    <span className="text-[var(--n-500)]">{item.productName || `รายการ ${idx + 1}`} ×{item.quantity}</span>
                    <span className="text-[var(--n-200)]">฿{((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="h-px bg-[var(--n-700)] my-1" />
                {surgeAmount > 0 && (
                  <div className="flex justify-between text-[0.8rem]">
                    <span className="text-[var(--n-500)]">Surge ({weatherData?.main})</span>
                    <span className="text-[var(--brand-400)]">+฿{surgeAmount.toFixed(0)}</span>
                  </div>
                )}
                {formData.hasInsurance && (
                  <div className="flex justify-between text-[0.8rem]">
                    <span className="text-[var(--n-500)]">ประกันภัย</span>
                    <span className="text-[oklch(65%_0.12_270)]">+฿50</span>
                  </div>
                )}
                <div className="h-px bg-[var(--n-700)] my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="sp-caps text-[var(--n-500)]">รวมสุทธิ</span>
                  <span className="sp-font-display text-[1.75rem] font-black text-[var(--n-900)]">
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
