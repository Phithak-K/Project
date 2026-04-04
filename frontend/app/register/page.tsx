'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Customer'); // ค่าเริ่มต้นเป็นลูกค้า
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('🎉 สมัครสมาชิกสำเร็จ! (ในระบบจริงจะมีอีเมลส่งรหัส OTP ไปให้ครับ)');
        // สมัครเสร็จให้เด้งไปหน้า Login
        window.location.href = '/login';
      } else {
        alert(`❌ ผิดพลาด: ${data.message || 'ข้อมูลไม่ถูกต้อง'}`);
      }
    } catch (error) {
      console.error('Register Error:', error);
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">สร้างบัญชีใหม่</h2>
          <p className="text-gray-500 mt-2">เข้าร่วมเป็นส่วนหนึ่งของ SwiftPath</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* เลือกประเภทบัญชี */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สมัครในฐานะ</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Customer">👤 ลูกค้าทั่วไป (Customer)</option>
              <option value="Merchant">🏬 ร้านค้า (Merchant)</option>
              <option value="Driver">🚚 คนขับรถส่งของ (Driver)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ - นามสกุล</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="สมชาย ใจดี"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0812345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400"
          >
            {isLoading ? 'กำลังประมวลผล...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            เข้าสู่ระบบ
          </Link>
        </p>
        
      </div>
    </div>
  );
}