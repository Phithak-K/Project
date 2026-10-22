'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, CheckCircle, ArrowLeft, Zap } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe Promise (โหลดครั้งเดียวนอก Component)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

const PRESETS = [100, 300, 500, 1000, 2000];

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg('');

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // ระบุ return_url ได้ถ้าต้องการ redirect, แต่เราใช้ if_required เพื่ออยู่ในหน้าเดิม
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setErrorMsg(submitError.message || 'การชำระเงินไม่สำเร็จ');
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setLoading(false);
      onSuccess();
    } else {
      // กรณีอื่นๆ เช่น processing
      setLoading(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mt-4">
      <div className="bg-[var(--n-200)] rounded-xl p-4 border border-[var(--n-700)] mb-6">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {errorMsg && (
        <div className="bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg py-3 px-4 text-[var(--danger-text)] text-sm mb-4">
          {errorMsg}
        </div>
      )}

      <button
        disabled={!stripe || loading}
        className="sp-btn-primary sp-btn-full p-3.5 justify-center"
      >
        {loading ? <span className="sp-spinner" /> : <><CreditCard size={16} /> ยืนยันชำระเงิน</>}
      </button>
    </form>
  );
}

export default function DriverWalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | string>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [clientSecret, setClientSecret] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getCookie = (name: string) => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    return p.length === 2 ? p.pop()?.split(';').shift() ?? null : null;
  };

  const fetchBalance = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Driver') { router.push('/login'); return; }
    try {
      const res = await fetch('/api/proxy/users/me');
      if (res.ok) {
        const data = await res.json();
        setBalance(Number(data.balance || 0));
      }
    } catch (e) { console.warn(e); }
    finally { setPageLoading(false); }
  }, [router]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const finalAmount = customAmount ? Number(customAmount) : Number(amount);
  const isSubmitting = useRef(false);

  const handleCreateTopUp = async () => {
    if (isSubmitting.current) return;
    if (!finalAmount || finalAmount < 20 || finalAmount > 100000) {
      setErrorMsg('กรุณาระบุจำนวนเงินระหว่าง 20 — 100,000 บาท');
      return;
    }
    
    isSubmitting.current = true;
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/stripe/create-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.message || 'ไม่สามารถสร้างคำขอชำระเงินได้'); setLoading(false); isSubmitting.current = false; return; }
      setClientSecret(data.clientSecret);
      setStep('processing');
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  if (pageLoading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
    </div>
  );

  return (
    <div className="sp-page">
      <nav className="sp-nav">
        <button onClick={() => router.push('/')} className="bg-transparent border-none cursor-pointer flex items-center gap-2 text-[var(--n-500)] text-sm">
          <ArrowLeft size={16} /> กลับ
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span>
          <span className="sp-caps text-[var(--n-500)] ml-2">Wallet</span>
        </span>
        <div className="w-[60px]" />
      </nav>

      <main className="max-w-[480px] mx-auto py-10 px-6">

        {/* Balance Card */}
        <div className="sp-card sp-animate bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-500)] border-none mb-8 relative overflow-hidden">
          <div className="absolute -top-[30px] -right-[20px] w-[120px] h-[120px] rounded-full bg-white/7" />
          <div className="absolute -bottom-[40px] -left-[10px] w-[100px] h-[100px] rounded-full bg-white/5" />
          <Wallet size={22} className="text-white/70 mb-4" />
          <p className="sp-caps text-white/60 mb-1.5">ยอดเงินคงเหลือ</p>
          <p className="sp-font-display text-4xl font-black text-white tracking-tight">
            ฿{balance !== null ? balance.toLocaleString() : '—'}
          </p>
        </div>

        {step === 'select' && (
          <div className="sp-animate">
            <div className="mb-8">
              <h2 className="sp-section-title mb-4">เลือกจำนวนเงิน</h2>
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    id={`preset-${p}`}
                    onClick={() => { setAmount(p); setCustomAmount(''); }}
                    className={`p-3 rounded-xl font-bold text-sm cursor-pointer transition-all ${amount === p && !customAmount ? 'border-2 border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-600)]' : 'border border-[var(--n-700)] bg-transparent text-[var(--n-200)]'}`}
                  >
                    ฿{p.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="sp-field">
                <label className="sp-label">หรือกรอกจำนวนเอง (20 — 100,000 บาท)</label>
                <input
                  id="custom-amount"
                  type="number"
                  min={20}
                  max={100000}
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setAmount('custom'); }}
                  placeholder="เช่น 750"
                  className="sp-input"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg py-3 px-4 text-[var(--danger-text)] text-sm mb-4">
                {errorMsg}
              </div>
            )}

            <div className="sp-card bg-[var(--n-50)] border border-[var(--n-700)] mb-5">
              <div className="flex justify-between text-sm text-[var(--n-500)] mb-2">
                <span>ยอดเงินปัจจุบัน</span>
                <span>฿{balance?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--n-500)] mb-2">
                <span>จำนวนที่เติม</span>
                <span className="font-bold text-[var(--brand-500)]">+฿{finalAmount?.toLocaleString()}</span>
              </div>
              <div className="h-[1px] bg-[var(--n-700)] my-2.5" />
              <div className="flex justify-between font-extrabold text-[var(--n-900)]">
                <span>ยอดใหม่โดยประมาณ</span>
                <span>฿{((balance || 0) + (finalAmount || 0)).toLocaleString()}</span>
              </div>
            </div>

            <button
              id="btn-create-topup"
              onClick={handleCreateTopUp}
              disabled={loading || !finalAmount}
              className="sp-btn-primary sp-btn-full p-3.5 justify-center"
            >
              {loading ? <span className="sp-spinner" /> : <><CreditCard size={16} /> ดำเนินการชำระเงิน</>}
            </button>
          </div>
        )}

        {step === 'processing' && clientSecret && (
          <div className="sp-animate">
            <button onClick={() => setStep('select')} className="bg-transparent border-none cursor-pointer flex items-center gap-2 text-[var(--n-500)] text-sm mb-6">
              <ArrowLeft size={16} /> ยกเลิก
            </button>
            <h2 className="sp-section-title mb-6">ชำระเงินอย่างปลอดภัย</h2>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <CheckoutForm onSuccess={() => {
                setStep('success');
                // ในระบบจริง Webhook จะอัปเดต balance รอสัก 2 วินาทีแล้วโหลดซ้ำ
                setTimeout(() => fetchBalance(), 2000);
              }} />
            </Elements>
          </div>
        )}

        {step === 'success' && (
            <div className="sp-card sp-animate text-center py-12 px-8">
              <div className="w-16 h-16 rounded-full bg-[var(--success-50)] text-[var(--success-600)] flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} />
              </div>
              <h2 className="sp-font-display sp-text-md mb-2 text-[var(--n-900)]">เติมเงินสำเร็จ!</h2>
              <p className="text-[var(--n-500)] mb-8">
                ระบบได้เพิ่มยอดเงิน ฿{finalAmount?.toLocaleString()} เข้ากระเป๋าของคุณแล้ว
              </p>
              <button onClick={() => { setStep('select'); setCustomAmount(''); setAmount(500); fetchBalance(); }}
              className="sp-btn-ghost mt-6">
              ทำรายการอื่นต่อ
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
