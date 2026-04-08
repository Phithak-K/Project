'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 1. 🍪 เก็บ Token และ Role ลงใน Cookie (เพื่อให้ Middleware อ่านได้)
        // ตั้งค่าให้หมดอายุใน 1 วัน (86400 วินาที)
        const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
        
        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; expires=${expires}; SameSite=Lax`;
        }
        
        const role = data.user?.role || 'Customer';
        document.cookie = `role=${role}; path=/; expires=${expires}; SameSite=Lax`;

        // 2. 🚀 Logic การ Redirect ตาม Role
        let targetSubdomain = 'app'; 
        if (role === 'Merchant') targetSubdomain = 'store';
        if (role === 'Driver') targetSubdomain = 'fleet';

        // 3. จัดการเรื่อง Domain
        const hostname = window.location.hostname;
        const isLocalhost = hostname.includes('localhost');
        const domain = isLocalhost ? 'localhost:3000' : 'swiftpath.com:3000';

        // เด้งไปที่ Subdomain นั้นๆ
        window.location.href = `http://${targetSubdomain}.${domain}/`;
        
      } else {
        alert(`❌ ${data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}`);
      }
    } catch (error) {
      console.error('Login Error:', error);
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-100">
            <span className="text-white text-2xl font-black">S</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">เข้าสู่ระบบ</h2>
          <p className="text-gray-400 mt-2 font-medium">SwiftPath Delivery System</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมล</label>
            <input 
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
              placeholder="name@example.com"
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
              isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
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
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="text-blue-600 font-black hover:underline underline-offset-4">
              สมัครสมาชิกที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}