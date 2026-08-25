'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CheckCircle, Calendar, DollarSign, User } from 'lucide-react';

export default function CustomerHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<{ stats: any, orders: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchHistory = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Customer') {
      router.push('/login');
      return;
    }
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await fetch(`/api/proxy/orders/customer/history?${queryParams.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const downloadPDF = async () => {
    const element = document.getElementById('formal-pdf-report');
    if (!element) return;
    
    // Show the formal report temporarily for rendering
    element.style.display = 'block';

    try {
      // Dynamically import html2pdf.js to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;
      const opt: any = {
        margin:       0.4,
        filename:     `รายงานสรุปยอดใช้จ่าย_${startDate || 'ทั้งหมด'}_ถึง_${endDate || 'ปัจจุบัน'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      // Hide it again
      element.style.display = 'none';
    }
  };

  if (isLoading) {
    return (
      <div className="sp-page-loading" style={{ background: 'var(--n-50)' }}>
        <span className="sp-spinner sp-spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
      </div>
    );
  }

  return (
    <div className="sp-page" style={{ minHeight: '100vh', background: 'var(--n-50)', paddingBottom: '4rem' }}>
      {/* ── Nav ── */}
      <nav className="sp-nav" style={{ background: '#fff', borderBottom: '1px solid var(--n-200)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--n-600)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--n-900)' }}>ประวัติการสั่งซื้อย้อนหลัง</span>
        </div>
      </nav>

      <main id="report-content" className="sp-container" style={{ paddingTop: '2rem', paddingBottom: '2rem', background: 'var(--n-50)' }}>
        
        {/* ── Date Filters ── */}
        <div className="sp-no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--brand-500)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              วันนี้
            </button>
            <button 
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yStr = yesterday.toISOString().split('T')[0];
                setStartDate(yStr);
                setEndDate(yStr);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--n-100)', border: '1px solid var(--n-200)', borderRadius: '20px', color: 'var(--n-700)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              เมื่อวาน
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const last7 = new Date();
                last7.setDate(today.getDate() - 7);
                setStartDate(last7.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--n-100)', border: '1px solid var(--n-200)', borderRadius: '20px', color: 'var(--n-700)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              7 วันล่าสุด
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              style={{ padding: '0.4rem 0.75rem', background: 'var(--n-100)', border: '1px solid var(--n-200)', borderRadius: '20px', color: 'var(--n-700)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              เดือนนี้
            </button>
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }} 
              style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid var(--n-300)', borderRadius: '20px', color: 'var(--n-500)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ล้างค่า
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--n-500)', fontWeight: 600, marginBottom: '0.25rem' }}>เริ่มต้น</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                onClick={(e) => 'showPicker' in e.currentTarget && e.currentTarget.showPicker()}
                className="sp-input" 
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--n-500)', fontWeight: 600, marginBottom: '0.25rem' }}>สิ้นสุด</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                onClick={(e) => 'showPicker' in e.currentTarget && e.currentTarget.showPicker()}
                className="sp-input" 
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* ── KPI Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          <div className="sp-card sp-animate" style={{ background: '#fff', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', background: 'var(--brand-50)', borderRadius: '10px' }}>
                <Package size={20} style={{ color: 'var(--brand-600)' }} />
              </div>
              <span style={{ fontSize: '0.9rem', color: 'var(--n-600)', fontWeight: 700 }}>พัสดุรับแล้ว</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--n-900)' }}>
              {data?.stats?.totalDelivered || 0} <span style={{ fontSize: '1rem', color: 'var(--n-500)', fontWeight: 600 }}>รายการ</span>
            </div>
          </div>

          <div className="sp-card sp-animate" style={{ animationDelay: '0.1s', background: '#fff', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(46, 125, 50, 0.1)', borderRadius: '10px' }}>
                <DollarSign size={20} style={{ color: 'rgb(46, 125, 50)' }} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--n-600)', fontWeight: 600 }}>ยอดใช้จ่ายรวม</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--n-900)' }}>
              <span style={{ fontSize: '1.25rem', color: 'var(--n-500)', marginRight: '0.25rem' }}>฿</span>
              {Number(data?.stats?.totalSpent || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── Order History List ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--n-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--brand-600)' }} /> ประวัติย้อนหลัง
          </h2>
          <button 
            className="sp-no-print sp-btn-primary" 
            onClick={downloadPDF} 
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🖨️ ดาวน์โหลดไฟล์ PDF
          </button>
        </div>

        {!data?.orders || data.orders.length === 0 ? (
          <div className="sp-card sp-animate-d1" style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff' }}>
            <Package size={48} style={{ color: 'var(--n-300)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--n-500)', fontSize: '1rem' }}>ยังไม่มีประวัติการรับพัสดุในช่วงเวลานี้</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.orders.map((order, idx) => (
              <div key={order.id} className="sp-card sp-animate" style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s`, padding: '1.5rem', background: '#fff', border: '1px solid var(--n-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(46, 125, 50, 0.1)', color: 'rgb(30, 100, 35)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                      <CheckCircle size={14} /> DELIVERED
                    </span>
                    <h3 style={{ color: 'var(--n-900)', fontSize: '1rem', fontWeight: 700 }}>#{order.trackingNumber}</h3>
                    <p style={{ color: 'var(--n-500)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {new Date(order.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--brand-700)', fontWeight: 800, fontSize: '1.1rem' }}>
                      - ฿{Number(order.totalPrice || order.price || 0).toLocaleString()}
                    </div>
                    <div style={{ color: 'var(--n-500)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      {order.paymentMethod === 'COD' || order.paymentStatus === 'Unpaid' ? 'เก็บเงินปลายทาง (COD)' : 'ชำระล่วงหน้าแล้ว'}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--n-50)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--n-200)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <User size={16} style={{ color: 'var(--brand-500)', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <p style={{ color: 'var(--n-700)', fontSize: '0.875rem', fontWeight: 600 }}>จัดส่งโดย: {order.driver?.name || 'ไม่ระบุคนขับ'}</p>
                      <p style={{ color: 'var(--n-500)', fontSize: '0.8rem', marginTop: '0.125rem' }}>เบอร์โทร: {order.driver?.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {order.proofOfDelivery && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--n-200)' }}>
                    <img 
                      src={
                        order.proofOfDelivery.startsWith('http') || order.proofOfDelivery.startsWith('data:') 
                          ? order.proofOfDelivery 
                          : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${order.proofOfDelivery.startsWith('/') ? '' : '/'}${order.proofOfDelivery}`
                      } 
                      alt="Proof" 
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--n-200)' }} 
                      crossOrigin="anonymous"
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--n-700)', fontWeight: 600 }}>หลักฐานการส่งมอบ</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--n-500)' }}>อัปโหลดแล้ว</p>
                    </div>
                    <CheckCircle size={16} style={{ color: 'rgb(46, 125, 50)', marginRight: '0.5rem' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formal PDF Report Template (Hidden from screen, used only for PDF generation) */}
        <div id="formal-pdf-report" style={{ display: 'none', background: '#fff', color: '#000', padding: '40px', width: '700px', boxSizing: 'border-box', margin: '0 auto', fontFamily: 'Tahoma, "Kanit", sans-serif' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '3px solid #111', paddingBottom: '15px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#111', letterSpacing: '0.05em' }}>SWIFTPATH LOGISTICS</h1>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '8px 0', color: '#444' }}>รายงานสรุปยอดใช้จ่ายของลูกค้า (Expense Report)</h2>
            <p style={{ fontSize: '13px', margin: 0, color: '#666' }}>
              รอบระยะเวลา: <span style={{ color: '#111', fontWeight: 600 }}>{startDate ? new Date(startDate).toLocaleDateString('th-TH') : 'เริ่มต้น'}</span> ถึง <span style={{ color: '#111', fontWeight: 600 }}>{endDate ? new Date(endDate).toLocaleDateString('th-TH') : 'ปัจจุบัน'}</span>
            </p>
            <p style={{ fontSize: '11px', margin: '5px 0 0 0', color: '#888' }}>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
          </div>

          {/* Executive Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', padding: '15px 30px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #dee2e6' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase' }}>จำนวนพัสดุรับแล้ว</p>
              <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 800, color: '#2e7d32' }}>{data?.stats?.totalDelivered || 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#555' }}>รายการ</span></p>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase' }}>ยอดใช้จ่ายสุทธิ (Total Spent)</p>
              <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 800, color: '#c62828' }}>฿{Number(data?.stats?.totalSpent || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Detailed Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '40px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', borderBottom: '2px solid #adb5bd' }}>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#212529', width: '8%' }}>ลำดับ</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#212529', width: '22%' }}>หมายเลขพัสดุ</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#212529', width: '18%' }}>วันที่ได้รับ</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#212529', width: '22%' }}>ชื่อร้านค้า (หรือผู้ส่ง)</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#212529', width: '15%' }}>รูปแบบชำระ</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#212529', width: '15%' }}>ยอดเงิน (฿)</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders?.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#868e96', fontStyle: 'italic' }}>ไม่มีข้อมูลพัสดุในช่วงเวลานี้</td></tr>
              ) : (
                data?.orders?.map((order, idx) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e9ecef', background: idx % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                    <td style={{ padding: '10px 8px', color: '#495057', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#212529' }}>{order.trackingNumber}</td>
                    <td style={{ padding: '10px 8px', color: '#495057' }}>{new Date(order.updatedAt).toLocaleDateString('th-TH')}</td>
                    <td style={{ padding: '10px 8px', color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.merchant?.storeName || order.merchant?.name || '-'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: order.paymentMethod === 'COD' ? '#e65100' : '#2e7d32', fontWeight: 600 }}>
                      {order.paymentMethod === 'COD' ? 'COD' : 'Prepaid'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#212529' }}>
                      {Number(order.totalPrice || order.price || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 30px' }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #343a40', height: '30px', marginBottom: '12px' }}></div>
              <p style={{ fontSize: '13px', margin: 0, color: '#212529', fontWeight: 600 }}>ผู้จัดทำรายงาน (ลูกค้า)</p>
              <p style={{ fontSize: '11px', color: '#868e96', marginTop: '4px' }}>(ลงชื่อ และ วันที่)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
