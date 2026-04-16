'use client';

import Link from 'next/link';
import { Truck, Store, User, ArrowRight, Shield, Zap, Globe } from 'lucide-react';

export default function SwiftPathLanding() {
  return (
    <div className="sp-page" style={{ background: 'var(--n-50)' }}>
      {/* ── Navigation ── */}
      <nav className="sp-nav" style={{ borderBottom: 'none', background: 'transparent' }}>
        <span className="sp-logo">Swift<span className="sp-logo-accent">Path</span></span>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/login" className="sp-link-muted" style={{ fontSize: '0.875rem' }}>ทีมพัฒนาระบบ</Link>
          <Link href="/login">
            <button className="sp-btn-brand" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Log In</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero Unit ── */}
      <main>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
          <div className="sp-animate" style={{ maxWidth: '800px' }}>
            <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>Elite Logistics Network</span>
            <h1 className="sp-font-display" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 0.9, fontWeight: 900, letterSpacing: '-0.04em' }}>
              FAST. <br />
              <span style={{ color: 'var(--brand-500)' }}>PRECISE.</span> <br />
              POWERFUL.
            </h1>
            <p style={{ marginTop: '2rem', fontSize: '1.25rem', color: 'var(--n-600)', maxWidth: '500px', lineHeight: 1.5 }}>
              Precision logistics for the modern world. One platform, three portals, total control.
            </p>
          </div>

          {/* ── Role Selection Unit ── */}
          <div className="sp-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '5rem' }}>
            
            {/* Customer Card */}
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <div className="sp-card role-card" style={{ padding: '3rem', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ background: 'var(--n-900)', color: '#fff', width: '56px', height: '56px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                  <User size={28} />
                </div>
                <h3 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--n-900)' }}>Customer</h3>
                <p style={{ color: 'var(--n-500)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>ส่งพัสดุส่วนตัว ติดตามสถานะแบบ Real-time และชำระเงินง่ายผ่าน Wallet.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-600)', fontWeight: 700, fontSize: '0.875rem' }}>
                  Get Started <ArrowRight size={16} />
                </div>
              </div>
            </Link>

            {/* Merchant Card */}
            <Link href="/merchant/login" style={{ textDecoration: 'none' }}>
              <div className="sp-card role-card" style={{ padding: '3rem', border: '1.5px solid var(--brand-200)', cursor: 'pointer' }}>
                 <div style={{ background: 'var(--brand-500)', color: '#fff', width: '56px', height: '56px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                  <Store size={28} />
                </div>
                <h3 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--n-900)' }}>Partner Store</h3>
                <p style={{ color: 'var(--n-500)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>แดชบอร์ดจัดการคำสั่งซื้อ สถิติยอดขาย และระบบเรียกคนขับอัตโนมัติ.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-600)', fontWeight: 700, fontSize: '0.875rem' }}>
                  Join Network <ArrowRight size={16} />
                </div>
              </div>
            </Link>

            {/* Driver Card */}
            <Link href="/driver/login" style={{ textDecoration: 'none' }}>
              <div className="sp-card role-card sp-card-dark" style={{ padding: '3rem', cursor: 'pointer' }}>
                 <div style={{ background: 'var(--n-50)', color: 'var(--n-900)', width: '56px', height: '56px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                  <Truck size={28} />
                </div>
                <h3 className="sp-font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--n-50)' }}>Fleet Driver</h3>
                <p style={{ color: 'var(--n-500)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>รับงานส่งของอิสระ ถอนเงินไว พร้อมโบนัสพิเศษช่วงสภาพอากาศเปลี่ยนแปลง.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-400)', fontWeight: 700, fontSize: '0.875rem' }}>
                  Earn Now <ArrowRight size={16} />
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* ── Feature Highlight ── */}
        <section style={{ borderTop: '1px solid var(--n-200)', marginTop: '4rem', padding: '6rem 0' }}>
           <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '4rem' }}>
             <div>
               <Shield size={32} style={{ color: 'oklch(65% 0.12 270)', marginBottom: '1.5rem' }} />
               <h4 style={{ fontWeight: 900, marginBottom: '1rem' }}>Enterprise Security</h4>
               <p style={{ color: 'var(--n-500)', fontSize: '0.875rem', lineHeight: 1.6 }}>ระบบ Transaction แบบ Atomic Lock และประกันภัยสินค้าทุกรายการเพื่อความสบายใจสูงสุด.</p>
             </div>
             <div>
               <Zap size={32} style={{ color: 'var(--brand-500)', marginBottom: '1.5rem' }} />
               <h4 style={{ fontWeight: 900, marginBottom: '1rem' }}>Smart Surge</h4>
               <p style={{ color: 'var(--n-500)', fontSize: '0.875rem', lineHeight: 1.6 }}>คำนวณราคาตามสภาพอากาศและระยะทางแบบ Real-time เพื่อรายได้ที่เป็นธรรมของคนขับ.</p>
             </div>
             <div>
               <Globe size={32} style={{ color: 'var(--info-text)', marginBottom: '1.5rem' }} />
               <h4 style={{ fontWeight: 900, marginBottom: '1rem' }}>Fleet Radar</h4>
               <p style={{ color: 'var(--n-500)', fontSize: '0.875rem', lineHeight: 1.6 }}>มองเห็นออเดอร์ในพื้นที่ผ่านระบบเรดาร์ และ Chat คุยกับร้านค้าได้ทันทีผ่าน Socket.io.</p>
             </div>
           </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: 'var(--n-900)', color: 'var(--n-500)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <span className="sp-logo" style={{ color: '#fff' }}>Swift<span className="sp-logo-accent">Path</span></span>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}> 2026 SwiftPath Logistics. All rights reserved.</p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem' }}>
             <Link href="#" style={{ color: 'white', textDecoration: 'none' }}>Privacy Policy</Link>
             <Link href="#" style={{ color: 'white', textDecoration: 'none' }}>Terms of Service</Link>
             <Link href="#" style={{ color: 'white', textDecoration: 'none' }}>API Document</Link>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .role-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.1) !important;
          border-color: var(--brand-500) !important;
        }
      `}</style>
    </div>
  );
}
