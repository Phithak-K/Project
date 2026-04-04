'use client'; 

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 1. เก็บ Token ลงใน LocalStorage ของเบราว์เซอร์
        const token = data.access_token;
        localStorage.setItem('token', token);

        // 2. แกะกล่อง Token เพื่อดูว่าคนนี้มี Role เป็นอะไร
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const userRole = decodedPayload.role;

        // 3. เด้งไปหน้า Dashboard ตาม Role ของแต่ละคน
        if (userRole === 'Merchant') {
          window.location.href = '/merchant';
        } else if (userRole === 'Driver') {
          window.location.href = '/driver';
        } else if (userRole === 'Admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/customer'; // ค่าเริ่มต้นคือลูกค้า
        }
        
      } else {
        alert(`❌ ผิดพลาด: ${data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}`);
      }
    } catch (error) {
      console.error('Login Error:', error);
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">SwiftPath</h2>
          <p className="text-gray-500 mt-2">เข้าสู่ระบบเพื่อจัดการออเดอร์</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            เข้าสู่ระบบ
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            สมัครสมาชิก
          </Link>
        </p>
        
      </div>
    </div>
  );
}