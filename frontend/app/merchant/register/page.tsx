'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  const [role] = useState('Merchant');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Validation เบื้องต้น
    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('กรุณายอมรับเงื่อนไขการใช้บริการ');
      return;
    }

    setIsLoading(true);

    try {
      // ใช้ NEXT_PUBLIC_API_URL จาก Environment
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('🎉 สมัครสมาชิกสำเร็จ! ระบบได้ส่งรหัส OTP ไปที่อีเมลของคุณแล้ว');
        
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        window.location.href = `https://store.${baseDomain}/verify-otp?email=${encodeURIComponent(email)}`;
      } else {
        setErrorMsg(data.message || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
    } catch (error) {
      console.error('Catch Error:', error);
      setErrorMsg('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (กรุณาตรวจสอบว่า Backend รันอยู่)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 transform transition-all hover:scale-[1.01]">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-100 rotate-3">
            <span className="text-white text-2xl font-black">S</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">เข้าร่วม SwiftPath</h2>
          <p className="text-gray-400 mt-2 font-medium">สมัครสมาชิกสำหรับร้านค้า (Merchant)</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-pulse">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* ชื่อร้านค้า */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">ชื่อร้านค้า / ชื่อผู้ติดต่อ</label>
            <input
              type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
              placeholder="เช่น ร้านสมใจ ขนส่ง"
            />
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* เบอร์โทรศัพท์ */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">เบอร์โทรศัพท์</label>
              <input
                type="tel" required value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
                placeholder="081XXXXXXX"
              />
            </div>

            {/* อีเมล */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมลธุรกิจ</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* รหัสผ่าน */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">รหัสผ่าน</label>
            <input
              type={showPassword ? "text" : "password"}
              required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
              placeholder="รหัสผ่าน 6 ตัวขึ้นไป"
            />
            <button 
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-gray-400 hover:text-purple-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* ยืนยันรหัสผ่าน */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">ยืนยันรหัสผ่านอีกครั้ง</label>
            <input
              type={showPassword ? "text" : "password"}
              required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
              placeholder="พิมพ์รหัสผ่านให้ตรงกัน"
            />
          </div>

          {/* ยอมรับเงื่อนไข */}
          <div className="flex items-start gap-3 py-2 ml-1">
            <input 
              type="checkbox" id="terms" 
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
              ฉันยอมรับ <span className="text-purple-600 font-bold hover:underline">เงื่อนไขการให้บริการ</span> และนโยบายของ SwiftPath
            </label>
          </div>

          {/* ปุ่มสมัครสมาชิก */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 ${
              isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200 transform hover:-translate-y-1'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck size={20} />
                สมัครสมาชิกเปิดร้านค้า
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          มีบัญชีร้านค้าอยู่แล้ว?{' '}
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-black decoration-2 hover:underline underline-offset-4 transition-all">
            เข้าสู่ระบบที่นี่
          </Link>
        </p>
        
      </div>
    </div>
  );
}