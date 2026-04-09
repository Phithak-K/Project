'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Truck, CheckCircle2 } from 'lucide-react'; // อย่าลืม npm install lucide-react

export default function DriverRegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [role] = useState('Driver');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

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
        alert('🎉 สมัครเป็นคนขับสำเร็จ! ยินดีต้อนรับสู่ทีม SwiftPath');
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        window.location.href = `https://fleet.${baseDomain}/login`;
      } else {
        setErrorMsg(data.message || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
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
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-orange-100 relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-50"></div>

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-200">
            <Truck className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">ร่วมทีมกับเรา</h2>
          <p className="text-gray-400 mt-2 font-medium">สมัครเป็นคนขับรถส่งของ (Driver)</p>
          
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200 uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
            Role: Driver Only
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* ชื่อ-นามสกุล */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">ชื่อ - นามสกุลคนขับ</label>
            <input
              type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
              placeholder="นายสมชาย ใจดี"
            />
          </div>

          {/* เบอร์โทรศัพท์ */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">เบอร์โทรศัพท์ (ใช้รับงาน)</label>
            <input
              type="tel" required value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
              placeholder="08XXXXXXXX"
            />
          </div>

          {/* อีเมล */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมล</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
              placeholder="driver@swiftpath.com"
            />
          </div>

          {/* รหัสผ่าน */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">รหัสผ่าน</label>
            <input
              type={showPassword ? "text" : "password"}
              required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
              placeholder="รหัสผ่านเข้าใช้งานแอป"
            />
            <button 
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-gray-400 hover:text-orange-600 transition-colors"
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
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
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
              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-100 transform hover:-translate-y-1'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 size={20} />
                สมัครเป็นพาร์ทเนอร์คนขับ
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          เป็นคนขับอยู่แล้ว?{' '}
          <Link href="/login" className="text-orange-600 hover:text-orange-700 font-black">
            เข้าสู่ระบบที่นี่
          </Link>
        </p>
        
      </div>
    </div>
  );
}