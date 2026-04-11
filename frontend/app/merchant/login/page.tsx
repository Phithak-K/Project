'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Lock } from 'lucide-react';

export default function MerchantLoginPage() {
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
        body: JSON.stringify({ email, password, role: 'Merchant' }),
      });

      const data = await response.json();

      if (response.ok) {
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const isLocalhost = baseDomain.includes('localhost');
        const cookieDomainStr = isLocalhost ? '' : `domain=.${baseDomain.split(':')[0]};`;
        
        document.cookie = `token=${data.access_token}; path=/; ${cookieDomainStr} max-age=86400; SameSite=None; Secure`;
        document.cookie = `role=${data.user.role}; path=/; ${cookieDomainStr} max-age=86400; SameSite=None; Secure`;
        
        // Redirect ไปที่หน้า Merchant Dashboard แบบ HTTPS
        window.location.href = `https://store.${baseDomain}/`;
      } else {
        alert(`❌ เข้าสู่ระบบไม่สำเร็จ: ${data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}`);
      }
    } catch (error: any) {
      console.error('Catch Error:', error);
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-purple-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-200">
            <Store className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Merchant Login</h2>
          <p className="text-gray-500 mt-2 font-medium">จัดการร้านค้าและออเดอร์ของคุณ</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">อีเมลร้านค้า</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
              placeholder="shop@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">รหัสผ่าน</label>
            <div className="relative">
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-gray-50/50"
                placeholder="••••••••"
              />
              <Lock className="absolute right-4 top-3.5 text-gray-300" size={20} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
              isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังตรวจสอบ...
              </div>
            ) : 'เข้าสู่ระบบร้านค้า'}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 font-medium">
            ยังไม่ได้ลงทะเบียนร้านค้า?{' '}
            <Link href="/register" className="text-purple-600 font-black hover:underline underline-offset-4">
              สมัครเปิดร้านที่นี่
            </Link>
          </p>
        </div>
        
      </div>
    </div>
  );
}