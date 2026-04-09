'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react'; // อย่าลืม npm install lucide-react

export default function CustomerRegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [role] = useState('Customer');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // ตรวจสอบว่ารหัสผ่านตรงกันหรือไม่
    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ สมัครสำเร็จ → ต้องยืนยัน OTP ก่อน (Backend กำหนด isVerified = false)
        const successMsg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบ OTP ในอีเมล';
        alert(`✅ ${successMsg}`);
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        window.location.href = `https://app.${baseDomain}/verify-otp?email=${encodeURIComponent(email)}`;
      } else {
        const errMsg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        setErrorMsg(errMsg);
      }
    } catch (error) {
      console.error('Catch Error:', error);
      setErrorMsg('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-blue-50 relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-60"></div>

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <UserPlus className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">เริ่มต้นใช้งาน</h2>
          <p className="text-gray-400 mt-2 font-medium">สร้างบัญชีสำหรับสั่งซื้อและติดตามพัสดุ</p>
          
          <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 uppercase tracking-wide">
            สมัครในฐานะ: ลูกค้าทั่วไป
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* ชื่อ-นามสกุล */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">ชื่อ - นามสกุล</label>
            <input
              type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="สมชาย ใจดี"
            />
          </div>

          {/* เบอร์โทรศัพท์ */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">เบอร์โทรศัพท์</label>
            <input
              type="tel" required value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="08XXXXXXXX"
            />
          </div>

          {/* อีเมล */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมล</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="customer@example.com"
            />
          </div>

          {/* รหัสผ่าน */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">รหัสผ่าน</label>
            <input
              type={showPassword ? "text" : "password"}
              required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
            <button 
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-gray-400 hover:text-blue-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* ยืนยันรหัสผ่าน */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">ยืนยันรหัสผ่าน</label>
            <input
              type={showPassword ? "text" : "password"}
              required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 ${
              isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 transform hover:-translate-y-1'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'สร้างบัญชีผู้ใช้งาน'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-black decoration-2 hover:underline underline-offset-4">
            เข้าสู่ระบบที่นี่
          </Link>
        </p>
        
      </div>
    </div>
  );
}