'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, MapPin } from 'lucide-react';

export default function TrackPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      router.push(`/track/${trackingNumber.trim().toUpperCase()}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--n-950, #09090b)',
      display: 'flex', flexDirection: 'column', color: '#f4f4f5',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <nav style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #18181b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
            Swift<span style={{ color: 'oklch(65% 0.18 30)' }}>Path</span>
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', borderLeft: '1px solid #27272a', paddingLeft: '0.75rem' }}>
            Public Tracking
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 1.5rem',
            background: 'oklch(20% 0.05 30)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid oklch(30% 0.1 30)'
          }}>
            <Package size={32} style={{ color: 'oklch(65% 0.18 30)' }} />
          </div>
          
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Track Your Package
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '1rem', marginBottom: '2.5rem' }}>
            Enter your tracking number to see real-time updates and driver location.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }}>
                <Search size={20} />
              </div>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. SP1234567890"
                required
                style={{
                  width: '100%',
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '16px',
                  padding: '1.25rem 1.25rem 1.25rem 3.5rem',
                  fontSize: '1.1rem',
                  color: '#f4f4f5',
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'oklch(65% 0.18 30)';
                  e.target.style.boxShadow = '0 0 0 4px oklch(25% 0.08 30)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#3f3f46';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!trackingNumber.trim()}
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: '16px',
                background: trackingNumber.trim() ? 'oklch(65% 0.18 30)' : '#27272a',
                color: trackingNumber.trim() ? '#fff' : '#71717a',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: trackingNumber.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, color 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <MapPin size={20} />
              Track Package
            </button>
          </form>
          
          <div style={{ marginTop: '3rem', fontSize: '0.8rem', color: '#52525b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <span>Privacy-First Tracking</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#52525b' }}></span>
            <span>Real-time Map</span>
          </div>
        </div>
      </main>
    </div>
  );
}
