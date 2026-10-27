'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CheckCircle, Calendar, DollarSign, User } from 'lucide-react';

export default function MerchantHistoryPage() {
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
    if (!role || role !== 'Merchant') {
      router.push('/login');
      return;
    }
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await fetch(`/api/proxy/orders/merchant/history?${queryParams.toString()}`);
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
        filename:     `รายงานสรุปยอดขาย_${startDate || 'ทั้งหมด'}_ถึง_${endDate || 'ปัจจุบัน'}.pdf`,
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
      <div className="sp-page-loading bg-[var(--n-50)]">
        <span className="sp-spinner sp-spinner-lg border-t-[var(--brand-500)]" />
      </div>
    );
  }

  return (
    <div className="sp-page min-h-screen bg-[var(--n-50)] pb-16">
      {/* ── Nav ── */}
      <nav className="sp-nav bg-white border-b border-[var(--n-200)] sticky top-0 z-10 p-0">
        <div className="sp-container flex items-center gap-4 w-full h-full">
          <button onClick={() => router.push('/merchant')} className="bg-transparent border-none text-[var(--n-600)] cursor-pointer flex">
            <ArrowLeft size={20} />
          </button>
          <span className="text-[1.1rem] font-bold text-[var(--n-900)]">ประวัติออเดอร์ร้านค้า</span>
        </div>
      </nav>

      <main id="report-content" className="sp-container py-8 bg-[var(--n-50)]">
        
        {/* ── Date Filters ── */}
        <div className="sp-no-print flex flex-col gap-4 mb-8 bg-white p-5 rounded-2xl border border-[var(--n-200)] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-3 py-1.5 bg-[var(--brand-500)] border-none rounded-full text-white text-xs font-semibold cursor-pointer"
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
              className="px-3 py-1.5 bg-[var(--n-100)] border border-[var(--n-200)] rounded-full text-[var(--n-700)] text-xs font-semibold cursor-pointer"
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
              className="px-3 py-1.5 bg-[var(--n-100)] border border-[var(--n-200)] rounded-full text-[var(--n-700)] text-xs font-semibold cursor-pointer"
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
              className="px-3 py-1.5 bg-[var(--n-100)] border border-[var(--n-200)] rounded-full text-[var(--n-700)] text-xs font-semibold cursor-pointer"
            >
              เดือนนี้
            </button>
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }} 
              className="px-3 py-1.5 bg-transparent border border-[var(--n-300)] rounded-full text-[var(--n-500)] text-xs font-semibold cursor-pointer"
            >
              ล้างค่า
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex-[1_1_120px]">
              <label className="block text-[0.7rem] text-[var(--n-500)] font-semibold mb-1">เริ่มต้น</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                onClick={(e) => 'showPicker' in e.currentTarget && e.currentTarget.showPicker()}
                className="sp-input w-full p-2 text-[0.8rem] cursor-pointer" 
              />
            </div>
            <div className="flex-[1_1_120px]">
              <label className="block text-[0.7rem] text-[var(--n-500)] font-semibold mb-1">สิ้นสุด</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                onClick={(e) => 'showPicker' in e.currentTarget && e.currentTarget.showPicker()}
                className="sp-input w-full p-2 text-[0.8rem] cursor-pointer" 
              />
            </div>
          </div>
        </div>



        {/* ── KPI Stats ── */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="sp-card sp-animate bg-white border border-[var(--n-200)] shadow-[0_4px_12px_rgba(0,0,0,0.03)] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[var(--brand-50)] rounded-[10px]">
                <Package size={20} className="text-[var(--brand-600)]" />
              </div>
              <span className="text-[0.9rem] text-[var(--n-600)] font-bold">ออเดอร์สำเร็จ</span>
            </div>
            <div className="text-[2.5rem] font-black text-[var(--n-900)]">
              {data?.stats?.totalDelivered || 0} <span className="text-base text-[var(--n-500)] font-semibold">ออเดอร์</span>
            </div>
          </div>

          <div className="sp-card sp-animate sp-animate-d1 bg-white border border-[var(--n-200)] shadow-[0_4px_12px_rgba(0,0,0,0.03)] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[rgba(46,125,50,0.1)] rounded-[10px]">
                <DollarSign size={20} className="text-[rgb(46,125,50)]" />
              </div>
              <span className="text-[0.9rem] text-[var(--n-600)] font-bold">ยอดขายรวม</span>
            </div>
            <div className="text-[2.5rem] font-black text-[var(--n-900)]">
              <span className="text-xl text-[var(--n-500)] mr-1">฿</span>
              {Number(data?.stats?.totalRevenue || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── Order History List ── */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[1.1rem] font-extrabold text-[var(--n-800)] flex items-center gap-2">
            <Calendar size={18} className="text-[var(--brand-600)]" /> ประวัติย้อนหลัง
          </h2>
          <button 
            className="sp-no-print sp-btn-primary px-4 py-1.5 text-[0.8rem] rounded-full flex items-center gap-1.5" 
            onClick={downloadPDF}
          >
            🖨️ ดาวน์โหลดไฟล์ PDF
          </button>
        </div>

        {!data?.orders || data.orders.length === 0 ? (
          <div className="sp-card sp-animate-d1 text-center py-16 px-8 bg-white">
            <Package size={48} className="text-[var(--n-300)] mx-auto mb-4" />
            <p className="text-[var(--n-500)] text-base">ยังไม่มีประวัติออเดอร์ในช่วงเวลานี้</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {data.orders.map((order, idx) => (
              <div key={order.id} className={`sp-card sp-animate p-6 bg-white border border-[var(--n-200)] shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-xl ${idx === 1 ? 'sp-animate-d1' : idx === 2 ? 'sp-animate-d2' : ''}`}>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-[rgba(46,125,50,0.1)] text-[rgb(30,100,35)] px-2.5 py-1.5 rounded-md text-[0.7rem] font-extrabold mb-3">
                      <CheckCircle size={14} /> DELIVERED
                    </span>
                    <h3 className="text-[var(--n-900)] text-base font-bold">#{order.trackingNumber}</h3>
                    <p className="text-[var(--n-500)] text-[0.8rem] mt-1">
                      {new Date(order.updatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--brand-700)] font-extrabold text-[1.1rem]">
                      + ฿{Number(order.totalPrice || order.price || 0).toLocaleString()}
                    </div>
                    <div className="text-[var(--n-500)] text-xs font-semibold mt-1">
                      {order.paymentMethod === 'COD' || order.paymentStatus === 'Unpaid' ? 'เก็บเงินปลายทาง (COD)' : 'ชำระล่วงหน้าแล้ว'}
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--n-50)] rounded-lg p-3 flex flex-col gap-2 border border-[var(--n-200)]">
                  <div className="flex gap-3 items-start">
                    <User size={16} className="text-[var(--brand-500)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[var(--n-700)] text-sm font-semibold">จัดส่งโดย: {order.driver?.name || 'ไม่ระบุคนขับ'}</p>
                      <p className="text-[var(--n-500)] text-[0.8rem] mt-0.5">เบอร์โทร: {order.driver?.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {order.proofOfDelivery && (
                  <div className="mt-4 flex items-center gap-2 bg-white p-2 rounded-lg border border-[var(--n-200)]">
                    <img 
                      src={
                        order.proofOfDelivery.startsWith('http') || order.proofOfDelivery.startsWith('data:') 
                          ? order.proofOfDelivery 
                          : `${process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://project-wi39.onrender.com')}${order.proofOfDelivery.startsWith('/') ? '' : '/'}${order.proofOfDelivery}`
                      } 
                      alt="Proof" 
                      className="w-10 h-10 object-cover rounded border border-[var(--n-200)]" 
                      crossOrigin="anonymous"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-[var(--n-700)] font-semibold">หลักฐานการส่งมอบ</p>
                      <p className="text-[0.7rem] text-[var(--n-500)]">อัปโหลดแล้ว</p>
                    </div>
                    <CheckCircle size={16} className="text-[rgb(46,125,50)] mr-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formal PDF Report Template (Hidden from screen, used only for PDF generation) */}
        <div id="formal-pdf-report" className="hidden bg-white text-black p-10 w-[700px] box-border mx-auto font-sans">
          {/* Header */}
          <div className="text-center mb-6 border-b-[3px] border-[#111] pb-4">
            <h1 className="text-[26px] font-extrabold m-0 text-[#111] tracking-[0.05em]">SWIFTPATH LOGISTICS</h1>
            <h2 className="text-[18px] font-semibold my-2 text-[#444]">รายงานสรุปยอดขายร้านค้า (Sales Report)</h2>
            <p className="text-[13px] m-0 text-[#666]">
              รอบระยะเวลา: <span className="text-[#111] font-semibold">{startDate ? new Date(startDate).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }) : 'เริ่มต้น'}</span> ถึง <span className="text-[#111] font-semibold">{endDate ? new Date(endDate).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }) : 'ปัจจุบัน'}</span>
            </p>
            <p className="text-[11px] mt-1 text-[#888]">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
          </div>

          {/* Executive Summary */}
          <div className="flex justify-between mb-6 px-7 py-4 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg">
            <div className="text-center flex-1 border-r border-[#dee2e6]">
              <p className="m-0 text-[13px] font-bold text-[#6c757d] uppercase">จำนวนออเดอร์สำเร็จ</p>
              <p className="mt-2 text-2xl font-extrabold text-[#2e7d32]">{data?.stats?.totalDelivered || 0} <span className="text-sm font-semibold text-[#555]">รายการ</span></p>
            </div>
            <div className="text-center flex-1">
              <p className="m-0 text-[13px] font-bold text-[#6c757d] uppercase">ยอดขายสุทธิ (Total Revenue)</p>
              <p className="mt-2 text-2xl font-extrabold text-[#c62828]">฿{Number(data?.stats?.totalRevenue || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Detailed Table */}
          <table className="w-full border-collapse text-xs mb-10 table-fixed">
            <thead>
              <tr className="bg-[#f1f3f5] border-b-2 border-[#adb5bd]">
                <th className="py-2.5 px-2 text-center text-[#212529] w-[8%]">ลำดับ</th>
                <th className="py-2.5 px-2 text-left text-[#212529] w-[22%]">หมายเลขพัสดุ</th>
                <th className="py-2.5 px-2 text-left text-[#212529] w-[18%]">วันที่สำเร็จ</th>
                <th className="py-2.5 px-2 text-left text-[#212529] w-[22%]">ชื่อผู้รับ</th>
                <th className="py-2.5 px-2 text-center text-[#212529] w-[15%]">รูปแบบชำระ</th>
                <th className="py-2.5 px-2 text-right text-[#212529] w-[15%]">ยอดเงิน (฿)</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders?.length === 0 ? (
                <tr><td colSpan={6} className="p-5 text-center text-[#868e96] italic">ไม่มีข้อมูลออเดอร์ในช่วงเวลานี้</td></tr>
              ) : (
                data?.orders?.map((order, idx) => (
                  <tr key={order.id} className={`border-b border-[#e9ecef] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                    <td className="py-2.5 px-2 text-[#495057] text-center">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-bold text-[#212529]">{order.trackingNumber}</td>
                    <td className="py-2.5 px-2 text-[#495057]">{new Date(order.updatedAt).toLocaleDateString('th-TH')}</td>
                    <td className="py-2.5 px-2 text-[#212529] whitespace-nowrap overflow-hidden text-ellipsis">{order.receiverName}</td>
                    <td className={`py-2.5 px-2 text-center font-semibold ${order.paymentMethod === 'COD' ? 'text-[#e65100]' : 'text-[#2e7d32]'}`}>
                      {order.paymentMethod === 'COD' ? 'COD' : 'Prepaid'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-[#212529]">
                      {Number(order.totalPrice || order.price || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between mt-16 px-7">
            <div className="text-center w-[220px]">
              <div className="border-b border-[#343a40] h-[30px] mb-3"></div>
              <p className="text-[13px] m-0 text-[#212529] font-semibold">ผู้จัดทำรายงาน</p>
              <p className="text-[11px] text-[#868e96] mt-1">(ลงชื่อ และ วันที่)</p>
            </div>
            <div className="text-center w-[220px]">
              <div className="border-b border-[#343a40] h-[30px] mb-3"></div>
              <p className="text-[13px] m-0 text-[#212529] font-semibold">ผู้อนุมัติ / ผู้จัดการ</p>
              <p className="text-[11px] text-[#868e96] mt-1">(ลงชื่อ และ วันที่)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
