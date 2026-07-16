export default function OrderSkeleton({ dark = false }: { dark?: boolean }) {
  const cardClass = dark ? "sp-card-dark sp-animate" : "sp-card sp-animate";
  const bgMain = dark ? 'var(--n-800)' : 'var(--n-200)';
  const bgSub = dark ? 'var(--n-700)' : 'var(--n-100)';
  const bgBox = dark ? 'var(--n-900)' : 'var(--n-50)';

  return (
    <div className={cardClass} style={{ padding: '1.25rem', marginBottom: '1rem', cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ width: '60%' }}>
          <div className="animate-pulse" style={{ height: '1.2rem', width: '80%', background: bgMain, borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
          <div className="animate-pulse" style={{ height: '1rem', width: '50%', background: bgSub, borderRadius: '0.25rem' }} />
        </div>
        <div className="animate-pulse" style={{ height: '1.5rem', width: '25%', background: bgSub, borderRadius: '1rem' }} />
      </div>

      <div style={{ padding: '0.75rem', background: bgBox, borderRadius: '0.5rem', marginBottom: '1rem' }}>
        <div className="animate-pulse" style={{ height: '0.8rem', width: '100%', background: bgMain, borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
        <div className="animate-pulse" style={{ height: '0.8rem', width: '70%', background: bgMain, borderRadius: '0.25rem' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="animate-pulse" style={{ height: '0.8rem', width: '30%', background: bgMain, borderRadius: '0.25rem' }} />
        <div className="animate-pulse" style={{ height: '1.2rem', width: '25%', background: bgMain, borderRadius: '0.25rem' }} />
      </div>
    </div>
  );
}
