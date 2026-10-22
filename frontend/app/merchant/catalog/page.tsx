'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PremiumModal from '@/components/PremiumModal';

interface Product {
  id: number;
  name: string;
  unit: string;
  defaultPrice: number;
  isActive: boolean;
}

const emptyForm = () => ({ name: '', unit: '', defaultPrice: '' });

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, type: 'confirm'|'danger'|'prompt', title: string, message: string, onConfirm: (val?: string) => void }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} });
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm());

  const getCookie = (name: string) => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  const fetchProducts = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Merchant') { router.push('/merchant/login'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/products/my/all');
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({ name: product.name, unit: product.unit || '', defaultPrice: String(product.defaultPrice) });
  };

  const startNew = () => {
    setEditingId('new');
    setForm(emptyForm());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('กรุณาระบุชื่อสินค้า'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), unit: form.unit.trim() || null, defaultPrice: parseFloat(form.defaultPrice) || 0 };
      const isNew = editingId === 'new';
      const url = isNew ? '/api/proxy/products' : `/api/proxy/products/${editingId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        cancelEdit();
        fetchProducts();
      } else {
        const err = await res.json();
        toast.error(err.message || 'บันทึกไม่สำเร็จ');
      }
    } catch { toast.error('Network Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, name: string) => {
    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: 'ลบสินค้า',
      message: `ยืนยันการลบสินค้า "${name}" ออกจากแคตตาล็อก ใช่หรือไม่?`,
      onConfirm: async () => {
        setDeleting(id);
        try {
          const res = await fetch(`/api/proxy/products/${id}`, { method: 'DELETE' });
          if (res.ok) {
            const result = await res.json();
            if (!result.deleted) toast.error(result.message);
            fetchProducts();
          } else {
            const err = await res.json();
            toast.error(err.message || 'ลบไม่สำเร็จ');
          }
        } catch { toast.error('Network Error'); }
        finally { setDeleting(null); }
      }
    });
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const res = await fetch(`/api/proxy/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (res.ok) fetchProducts();
      else toast.error('อัปเดตไม่สำเร็จ');
    } catch { toast.error('Network Error'); }
  };

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted flex items-center gap-2 bg-transparent border-none text-sm cursor-pointer">
          <ArrowLeft size={16} /> กลับ Dashboard
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div className="w-20" />
      </nav>

      <main className="max-w-[760px] mx-auto py-10 px-6">
        <div className="sp-animate mb-10">
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg font-black">Catalog สินค้า</h1>
          <p className="text-[var(--n-500)] mt-1">
            บันทึกรายการสินค้าที่ขายบ่อย เพื่อเลือกได้ง่ายตอนสร้างออเดอร์
          </p>
        </div>

        {/* ── Product List ── */}
        <div className="sp-card p-0 overflow-hidden">
          <div className="py-5 px-6 border-b border-[var(--n-150)] flex justify-between items-center">
            <h2 className="sp-section-title flex items-center gap-2">
              <BookOpen size={16} /> รายการสินค้า
            </h2>
            {editingId !== 'new' && (
              <button onClick={startNew} className="sp-btn-primary py-1.5 px-4 text-[0.85rem]">
                <Plus size={15} /> เพิ่มสินค้า
              </button>
            )}
          </div>

          {/* ── New Product Form ── */}
          {editingId === 'new' && (
            <div className="py-5 px-6 border-b border-[var(--n-150)] bg-[var(--brand-50)]">
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 mb-3">
                <div className="sp-field">
                  <label className="sp-label">ชื่อสินค้า *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="sp-input" placeholder="เช่น ปูนซีเมนต์ตราเพชร" autoFocus
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label">หน่วย</label>
                  <input type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="sp-input" placeholder="ถุง, เส้น, กก."
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label">ราคาเริ่มต้น (฿)</label>
                  <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: e.target.value })}
                    className="sp-input" placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={cancelEdit} className="sp-btn-ghost"><X size={15} /> ยกเลิก</button>
                <button onClick={handleSave} disabled={saving} className="sp-btn-brand">
                  {saving ? <span className="sp-spinner" /> : <><Check size={15} /> บันทึก</>}
                </button>
              </div>
            </div>
          )}

          {products.length === 0 && editingId !== 'new' ? (
            <div className="sp-empty-centered">
              <BookOpen size={28} className="sp-empty-icon" />
              <p className="sp-empty-title">ยังไม่มีสินค้าใน Catalog</p>
              <p className="sp-empty-body">กดปุ่ม "+ เพิ่มสินค้า" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div>
              {products.map(product => (
                <div key={product.id}>
                  {editingId === product.id ? (
                    // ── Edit Row ──
                    <div className="py-4 px-6 border-b border-[var(--n-100)] bg-[oklch(97%_0.01_250)]">
                      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 mb-3">
                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="sp-input" />
                        <input type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="sp-input" placeholder="หน่วย" />
                        <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: e.target.value })} className="sp-input" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={cancelEdit} className="sp-btn-ghost text-[0.8rem]"><X size={13} /> ยกเลิก</button>
                        <button onClick={handleSave} disabled={saving} className="sp-btn-brand text-[0.8rem] py-1.5 px-3.5">
                          {saving ? <span className="sp-spinner" /> : <><Check size={13} /> บันทึก</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Display Row ──
                    <div key={product.id} className={`flex justify-between items-center py-3.5 px-6 border-b border-[var(--n-100)] ${product.isActive ? 'opacity-100' : 'opacity-50'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{product.name}</span>
                          {!product.isActive && (
                            <span className="text-[0.65rem] text-[var(--n-400)] bg-[var(--n-100)] py-0.5 px-2 rounded-full">ปิดใช้งาน</span>
                          )}
                          {(product as any)._count?.orderItems > 0 && (
                            <span className="text-[0.65rem] text-[var(--brand-600)] bg-[var(--brand-50)] py-0.5 px-2 rounded-full">
                              เคยสั่ง {(product as any)._count.orderItems} ครั้ง
                            </span>
                          )}
                        </div>
                        <div className="text-[var(--n-500)] text-[0.8rem]">
                          ฿{Number(product.defaultPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })} / {product.unit || 'ชิ้น'}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => handleToggleActive(product)}
                          title={product.isActive ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                          className={`w-9 h-5 rounded-[10px] border-none cursor-pointer relative transition-colors duration-200 ${product.isActive ? 'bg-[var(--brand-500)]' : 'bg-[var(--n-200)]'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-[left] duration-200 ${product.isActive ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                        <button onClick={() => startEdit(product)} className="sp-btn-ghost py-1.5 px-2.5">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)} disabled={deleting === product.id}
                          className="sp-btn-danger py-1.5 px-2.5">
                          {deleting === product.id ? <span className="sp-spinner" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <PremiumModal {...modalConfig} onClose={() => setModalConfig(p => ({ ...p, isOpen: false }))} />
    </div>
  );
}
