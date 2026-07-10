'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm());

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const getToken = () => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; token=`);
    if (p.length === 2) return p.pop()?.split(';').shift();
    return null;
  };

  const fetchProducts = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push('/merchant/login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products/my/all`, { // all = รวมที่ปิดใช้งานด้วย
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [API_URL, router]);

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
    if (!form.name.trim()) { alert('กรุณาระบุชื่อสินค้า'); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), unit: form.unit.trim() || null, defaultPrice: parseFloat(form.defaultPrice) || 0 };
      const isNew = editingId === 'new';
      const url = isNew ? `${API_URL}/products` : `${API_URL}/products/${editingId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        cancelEdit();
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.message || 'บันทึกไม่สำเร็จ');
      }
    } catch { alert('Network Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ลบสินค้า "${name}" ออกจาก catalog?`)) return;
    const token = getToken();
    if (!token) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        // แสดง message ถ้าระบบ Soft Delete แทนการลบจริง
        if (!result.deleted) alert(result.message);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.message || 'ลบไม่สำเร็จ');
      }
    } catch { alert('Network Error'); }
    finally { setDeleting(null); }
  };

  const handleToggleActive = async (product: Product) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (res.ok) fetchProducts();
      else alert('อัปเดตไม่สำเร็จ');
    } catch { alert('Network Error'); }
  };

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/merchant')} className="sp-link-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> กลับ Dashboard
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ width: '80px' }} />
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div className="sp-animate" style={{ marginBottom: '2.5rem' }}>
          <span className="sp-section-eyebrow">Store Portal</span>
          <h1 className="sp-font-display sp-text-lg" style={{ fontWeight: 900 }}>Catalog สินค้า</h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.25rem' }}>
            บันทึกรายการสินค้าที่ขายบ่อย เพื่อเลือกได้ง่ายตอนสร้างออเดอร์
          </p>
        </div>

        {/* ── Product List ── */}
        <div className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--n-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="sp-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={16} /> รายการสินค้า
            </h2>
            {editingId !== 'new' && (
              <button onClick={startNew} className="sp-btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                <Plus size={15} /> เพิ่มสินค้า
              </button>
            )}
          </div>

          {/* ── New Product Form ── */}
          {editingId === 'new' && (
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--n-150)', background: 'var(--brand-50)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--n-100)', background: 'oklch(97% 0.01 250)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="sp-input" />
                        <input type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="sp-input" placeholder="หน่วย" />
                        <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: e.target.value })} className="sp-input" />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit} className="sp-btn-ghost" style={{ fontSize: '0.8rem' }}><X size={13} /> ยกเลิก</button>
                        <button onClick={handleSave} disabled={saving} className="sp-btn-brand" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                          {saving ? <span className="sp-spinner" /> : <><Check size={13} /> บันทึก</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Display Row ──
                    <div key={product.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--n-100)',
                      opacity: product.isActive ? 1 : 0.5,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>{product.name}</span>
                          {!product.isActive && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--n-400)', background: 'var(--n-100)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>ปิดใช้งาน</span>
                          )}
                          {(product as any)._count?.orderItems > 0 && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>
                              เคยสั่ง {(product as any)._count.orderItems} ครั้ง
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--n-500)', fontSize: '0.8rem' }}>
                          ฿{Number(product.defaultPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })} / {product.unit || 'ชิ้น'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => handleToggleActive(product)}
                          title={product.isActive ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                          style={{
                            width: '36px', height: '20px', borderRadius: '10px', border: 'none',
                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                            background: product.isActive ? 'var(--brand-500)' : 'var(--n-200)',
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: '2px', width: '16px', height: '16px',
                            borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                            left: product.isActive ? '18px' : '2px',
                          }} />
                        </button>
                        <button onClick={() => startEdit(product)} className="sp-btn-ghost" style={{ padding: '0.35rem 0.65rem' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)} disabled={deleting === product.id}
                          className="sp-btn-danger" style={{ padding: '0.35rem 0.65rem' }}>
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
    </div>
  );
}
