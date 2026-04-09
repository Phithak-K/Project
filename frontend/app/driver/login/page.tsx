'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Truck } from 'lucide-react';

export default function DriverLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 🍪 1. เก็บ Token และ Role ลงใน Cookie เพื่อให้ Middleware อ่านได้
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const isLocalhost = baseDomain.includes('localhost');
        const cookieDomainStr = isLocalhost ? '' : `domain=.${baseDomain.split(':')[0]};`;
        
        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; ${cookieDomainStr} max-age=86400; SameSite=None; Secure`;
        }
        
        // กำหนด Role เป็น Driver (หรือดึงจาก data.user.role ตามที่ Backend ส่งมา)
        const role = data.user?.role || 'Driver';
        document.cookie = `role=${role}; path=/; ${cookieDomainStr} max-age=86400; SameSite=None; Secure`;

        // 🚀 2. Redirect ไปที่หน้า Driver Dashboard ผ่าน Subdomain แบบ HTTPS
        window.location.href = `https://fleet.${baseDomain}/`;
      } else {
        alert(`❌ เข้าสู่ระบบไม่สำเร็จ: ${data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}`);
      }
    } catch (error) {
      console.error('Catch Error:', error);
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-orange-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-200">
            <Truck className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Driver Login</h2>
          <p className="text-gray-500 mt-2 font-medium">เข้าสู่ระบบเพื่อรับงานส่งของ</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมลคนขับ</label>
            <input 
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
              placeholder="driver@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">รหัสผ่าน</label>
            <input 
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-gray-50/50"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-100'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังตรวจสอบ...
              </div>
            ) : 'เข้าสู่ระบบคนขับ'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-gray-600 font-medium">
          ยังไม่ได้ลงทะเบียนคนขับ? <Link href="/register" className="text-orange-600 font-black hover:underline underline-offset-4">สมัครที่นี่</Link>
        </p>
      </div>
    </div>
  );
}