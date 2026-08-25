'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(''); // email ???? username
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isEmail = identifier.includes('@');
      const loginBody = isEmail
        ? { email: identifier, password, role: 'Customer' }
        : { username: identifier, password, role: 'Customer' };

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginBody),
      });

      const data = await response.json();

      if (response.ok) {
        const callbackRes = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: data.access_token, user: data.user }),
        });
        const callbackData = await callbackRes.json();

        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get('callbackUrl');
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const isLocalhost = baseDomain.includes('localhost');

        const isAllowedCallback = (url: string): boolean => {
          try {
            const parsed = new URL(decodeURIComponent(url));
            const allowed = ['localhost', 'swiftpath.com'];
            return allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
          } catch { return false; }
        };

        if (callbackUrl && isAllowedCallback(callbackUrl)) {
          window.location.href = decodeURIComponent(callbackUrl);
        } else {
          window.location.href = callbackData.redirectUrl || (isLocalhost ? `http://app.${baseDomain}/` : `https://app.${baseDomain}/`);
        }
      } else {
        setError(data.message || '???????????????????????????');
      }
    } catch {
      setError('???????????????????????????????????');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sp-page-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(2rem, 6vw, 6rem)', maxWidth: '600px', width: '100%' }}>
        <div className="sp-animate" style={{ marginBottom: '4rem' }}>
          <span className="sp-logo-dark" style={{ fontSize: '1.5rem' }}>Swift<span className="sp-logo-accent">Path</span></span>
          <div style={{ width: '40px', height: '4px', background: 'var(--brand-500)', marginTop: '0.5rem' }}></div>
        </div>

        <div className="sp-animate-d1" style={{ marginBottom: '3rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>CUSTOMER PORTAL</span>
          <h1 className="sp-font-display" style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1, marginTop: '0.5rem', letterSpacing: '-0.02em', color: 'var(--n-50)' }}>
            ???????????
          </h1>
          <p style={{ color: 'var(--n-500)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            ?????????????????????????????????
          </p>
        </div>

        {error && (
          <div className="sp-animate" style={{ padding: '1rem', borderLeft: '4px solid oklch(73% 0.19 50)', background: 'var(--n-850)', color: 'var(--n-50)', marginBottom: '2rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="sp-animate-d2" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <label className="sp-caps" style={{ display: 'block', color: 'var(--n-400)', marginBottom: '0.5rem' }}>????? ???? USERNAME</label>
            <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)} className="sp-input" placeholder="????????? ???? Username" />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <label className="sp-caps" style={{ color: 'var(--n-400)' }}>????????</label>
              <Link href="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--n-400)', fontWeight: 600, textDecoration: 'underline' }}>????????????</Link>
            </div>
            <div className="sp-input-wrap">
              <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="sp-input" placeholder="••••••••" />
              <button type="button" className="sp-input-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="sp-btn-primary" style={{ marginTop: '1rem', padding: '1.25rem', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            {isLoading ? <span className="sp-spinner" style={{ borderTopColor: 'var(--n-900)' }} /> : <span>???????????</span>}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="sp-animate-d3" style={{ marginTop: '3rem', borderTop: '1px solid var(--n-800)', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--n-500)', fontWeight: 500 }}>
            ?????????????? <Link href="/register" style={{ color: 'var(--n-50)', fontWeight: 700, textDecoration: 'underline' }}>?????????</Link>
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
            <a href={`//store.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`} style={{ fontSize: '0.75rem', color: 'var(--n-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>????????????? &rarr;</a>
            <a href={`//fleet.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}/login`} style={{ fontSize: '0.75rem', color: 'var(--n-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>??????????? &rarr;</a>
          </div>
        </div>
      </main>
    </div>
  );
}
