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
    <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid var(--n-200)', marginBottom: '1.5rem' }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {errorMsg && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--danger-text)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <button
        disabled={!stripe || loading}
        className="sp-btn-primary sp-btn-full"
        style={{ padding: '0.875rem', justifyContent: 'center' }}
      >
        {loading ? <span className="sp-spinner" /> : <><CreditCard size={16} /> ยืนยันชำระเงิน</>}
      </button>
    </form>
  );
}

export default function CustomerWalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | string>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [clientSecret, setClientSecret] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const getToken = () => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; token=`);
    return p.length === 2 ? p.pop()?.split(';').shift() ?? null : null;
  };

  const fetchBalance = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(Number(data.balance || 0));
      }
    } catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  }, [API_URL, router]);

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
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/stripe/create-topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--n-600)', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> กลับ
        </button>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span>
          <span className="sp-caps" style={{ color: 'var(--n-400)', marginLeft: '0.5rem' }}>Wallet</span>
        </span>
        <div style={{ width: '60px' }} />
      </nav>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Balance Card */}
        <div className="sp-card sp-animate" style={{ background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-500) 100%)', border: 'none', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-10px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <Wallet size={22} style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }} />
          <p className="sp-caps" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.375rem' }}>ยอดเงินคงเหลือ</p>
          <p className="sp-font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
            ฿{balance !== null ? balance.toLocaleString() : '—'}
          </p>
        </div>

        {step === 'select' && (
          <div className="sp-animate">
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="sp-section-title" style={{ marginBottom: '1rem' }}>เลือกจำนวนเงิน</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginBottom: '1rem' }}>
                {PRESETS.map(p => (
                  <button
                    key={p}
                    id={`preset-${p}`}
                    onClick={() => { setAmount(p); setCustomAmount(''); }}
                    style={{
                      padding: '0.75rem', borderRadius: '10px', fontWeight: 700,
                      fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s',
                      border: amount === p && !customAmount ? '2px solid var(--brand-500)' : '1px solid var(--n-200)',
                      background: amount === p && !customAmount ? 'var(--brand-50)' : 'transparent',
                      color: amount === p && !customAmount ? 'var(--brand-600)' : 'var(--n-700)',
                    }}
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
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--danger-text)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div className="sp-card" style={{ background: 'var(--n-50)', border: '1px solid var(--n-200)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--n-600)', marginBottom: '0.5rem' }}>
                <span>ยอดเงินปัจจุบัน</span>
                <span>฿{balance?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--n-600)', marginBottom: '0.5rem' }}>
                <span>จำนวนที่เติม</span>
                <span style={{ fontWeight: 700, color: 'var(--brand-600)' }}>+฿{finalAmount?.toLocaleString()}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--n-200)', margin: '0.625rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--n-900)' }}>
                <span>ยอดใหม่โดยประมาณ</span>
                <span>฿{((balance || 0) + (finalAmount || 0)).toLocaleString()}</span>
              </div>
            </div>

            <button
              id="btn-create-topup"
              onClick={handleCreateTopUp}
              disabled={loading || !finalAmount}
              className="sp-btn-primary sp-btn-full"
              style={{ padding: '0.875rem', justifyContent: 'center' }}
            >
              {loading ? <span className="sp-spinner" /> : <><CreditCard size={16} /> ดำเนินการชำระเงิน</>}
            </button>
          </div>
        )}

        {step === 'processing' && clientSecret && (
          <div className="sp-animate">
            <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--n-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              <ArrowLeft size={16} /> ยกเลิก
            </button>
            <h2 className="sp-section-title" style={{ marginBottom: '1.5rem' }}>ชำระเงินอย่างปลอดภัย</h2>
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
          <div className="sp-card sp-animate" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle size={30} style={{ color: 'var(--success-text)' }} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--n-900)', marginBottom: '0.5rem' }}>เติมเงินสำเร็จ</h3>
            <p style={{ color: 'var(--n-500)', fontSize: '0.9rem' }}>ยอดเงินของคุณได้รับการอัปเดตเรียบร้อยแล้ว</p>
            <button onClick={() => { setStep('select'); setCustomAmount(''); setAmount(500); fetchBalance(); }}
              className="sp-btn-ghost" style={{ marginTop: '1.5rem' }}>
              ทำรายการอื่นต่อ
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
