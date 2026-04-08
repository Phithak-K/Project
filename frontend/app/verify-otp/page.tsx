'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ ยืนยันตัวตนสำเร็จ! กำลังไปหน้า Login');
        router.push('/login');
      } else {
        alert(`❌ รหัสไม่ถูกต้อง: ${data.message}`);
      }
    } catch (error) {
      alert('❌ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('✅ ' + data.message);
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      alert('❌ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center">
        <Link href="/register" className="inline-flex items-center text-slate-400 hover:text-blue-600 mb-6 text-sm font-bold transition-colors">
          <ArrowLeft size={16} className="mr-1" /> ย้อนกลับไปสมัครใหม่
        </Link>

        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-[2rem] mb-6 shadow-lg shadow-blue-100">
          <KeyRound size={36} />
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">ยืนยันรหัส OTP</h2>
        <p className="text-slate-500 mb-8 font-medium text-sm">
          รหัส 6 หลักส่งไปที่ <br/>
          <span className="text-blue-600 font-bold">{email || 'อีเมลของคุณ'}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <input 
            type="text" 
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center text-5xl font-black tracking-[0.75rem] py-5 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-500 focus:ring-8 focus:ring-blue-50 outline-none transition-all"
            placeholder="000000"
          />

          <button 
            type="submit"
            disabled={isLoading || otp.length < 6}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all ${
              isLoading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัสเข้าใช้งาน'}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-sm text-slate-500 font-medium">
            ยังไม่ได้รับรหัส?{' '}
            <button 
              onClick={handleResend}
              disabled={isResending || !email}
              className="text-blue-600 font-black hover:underline disabled:text-slate-400"
            >
              {isResending ? 'กำลังส่งใหม่...' : 'ส่งรหัสอีกครั้ง'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}