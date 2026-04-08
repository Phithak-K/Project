'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setNeedsVerification(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 🍪 เก็บ Token และ Role ลงใน Cookie
        const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; expires=${expires}; SameSite=Lax`;
        }
        const role = data.user?.role || 'Customer';
        document.cookie = `role=${role}; path=/; expires=${expires}; SameSite=Lax`;

        // 🚀 Redirect ไปที่หน้า Dashboard ตาม Role
        if (role === 'Driver') {
          window.location.href = 'http://fleet.localhost:3000/';
        } else if (role === 'Merchant') {
          window.location.href = 'http://store.localhost:3000/';
        } else {
          window.location.href = 'http://app.localhost:3000/';
        }
      } else {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

        // ⚠️ ตรวจจับว่า account ยังไม่ verified → แสดงปุ่มไปยืนยัน OTP
        if (msg.includes('ยังไม่ได้ยืนยัน')) {
          setNeedsVerification(true);
          setErrorMsg('บัญชีนี้ยังไม่ได้ยืนยันตัวตน กรุณาตรวจสอบ OTP ในอีเมลของคุณ');
        } else {
          setErrorMsg(msg);
        }
      }
    } catch (error) {
      console.error('Login Error:', error);
      setErrorMsg('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-blue-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <User className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">เข้าสู่ระบบ</h2>
          <p className="text-gray-500 mt-2 font-medium">SwiftPath — สั่งของและติดตามพัสดุ</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
            <p className="font-bold">{errorMsg}</p>
            {needsVerification && (
              <a
                href={`/verify-otp?email=${encodeURIComponent(email)}`}
                className="mt-2 inline-block text-blue-600 font-black underline underline-offset-4 hover:text-blue-700"
              >
                → กดที่นี่เพื่อยืนยัน OTP อีกครั้ง
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมลผู้ใช้งาน</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">รหัสผ่าน</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังตรวจสอบ...
              </div>
            ) : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600 font-medium">
          ยังไม่มีบัญชี SwiftPath?{' '}
          <Link href="/register" className="text-blue-600 font-black hover:underline underline-offset-4">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  );
}