'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const role = 'Customer';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('❌ รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    if (password.length < 6) {
      alert('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);

    try {
      // ✅ NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 ใน .env.local
      // ใช้ 127.0.0.1 แทน localhost เพื่อหลีกเลี่ยง Chrome Private Network restrictions
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name, email, phone, password, role }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = { message: 'ไม่สามารถอ่าน Response จาก Server ได้' };
      }

      if (response.ok) {
        alert(`✅ ${data.message || 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบ OTP ในอีเมล'}`);
        // 🚀 แก้ไขการ Redirect ให้รักษา Domain ปัจจุบันไว้
        window.location.href = `${window.location.origin}/verify-otp?email=${encodeURIComponent(email)}`;
      } else {
        const errorMessage = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'ข้อมูลไม่ถูกต้อง';
        alert(`❌ สมัครไม่สำเร็จ: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Register Fetch Error:', error);
      alert('❌ ไม่สามารถติดต่อ Server ได้\n\nตรวจสอบว่ารัน NestJS (Port 8000) และปิด Block Insecure Private Network ใน Chrome Flags หรือยัง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-100 rotate-3">
            <span className="text-white text-2xl font-black -rotate-3">S</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">สร้างบัญชีใหม่</h2>
          <p className="text-slate-400 mt-1 text-sm font-medium">เข้าร่วมเครือข่าย SwiftPath วันนี้</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="group">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">ชื่อ - นามสกุล</label>
            <input
              type="text" required placeholder="สมชาย ใจดี" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-slate-50/50 placeholder:text-slate-300"
            />
          </div>

          <div className="group">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">เบอร์โทรศัพท์</label>
            <input
              type="tel" required placeholder="0812345678" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-slate-50/50 placeholder:text-slate-300"
            />
          </div>

          <div className="group">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">อีเมล</label>
            <input
              type="email" required placeholder="name@domain.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-slate-50/50 placeholder:text-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="group">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">รหัสผ่าน</label>
              <input
                type="password" required minLength={6} placeholder="••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-slate-50/50 placeholder:text-slate-300"
              />
            </div>
            <div className="group">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">ยืนยันรหัส</label>
              <input
                type="password" required placeholder="••••••" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-slate-50/50 placeholder:text-slate-300"
              />
            </div>
          </div>

          <button
            type="submit" disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 mt-4 ${
              isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังประมวลผล...
              </>
            ) : 'ลงทะเบียนบัญชี'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 font-medium">
            เป็นสมาชิกอยู่แล้ว?{' '}
            <Link href="/login" className="text-blue-600 font-black hover:text-blue-800 transition-colors">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
          <Link href="/merchant/register" className="flex items-center justify-center py-2 px-3 bg-purple-50 rounded-xl text-[10px] font-black text-purple-600 hover:bg-purple-100 transition-colors uppercase tracking-tighter">เป็นร้านค้า →</Link>
          <Link href="/driver/register" className="flex items-center justify-center py-2 px-3 bg-orange-50 rounded-xl text-[10px] font-black text-orange-600 hover:bg-orange-100 transition-colors uppercase tracking-tighter">เป็นคนขับ →</Link>
        </div>
      </div>
    </div>
  );
}