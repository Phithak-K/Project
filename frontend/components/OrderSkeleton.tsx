import React from 'react';

export default function OrderSkeleton() {
  return (
    <>
      <style>{`
        @keyframes sp-shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .sp-skeleton {
          background: #f6f7f8;
          background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
          background-repeat: no-repeat;
          background-size: 1000px 100%;
          animation-duration: 1.2s;
          animation-fill-mode: forwards;
          animation-iteration-count: infinite;
          animation-name: sp-shimmer;
          animation-timing-function: linear;
          border-radius: 4px;
        }
      `}</style>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ 
            background: 'var(--surface)', 
            padding: '1.25rem', 
            borderRadius: '16px', 
            border: '1px solid var(--n-200)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="sp-skeleton" style={{ height: '20px', width: '120px' }}></div>
              <div className="sp-skeleton" style={{ height: '24px', width: '60px', borderRadius: '20px' }}></div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="sp-skeleton" style={{ height: '40px', width: '40px', borderRadius: '50%' }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="sp-skeleton" style={{ height: '16px', width: '80%' }}></div>
                <div className="sp-skeleton" style={{ height: '14px', width: '50%' }}></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className="sp-skeleton" style={{ height: '36px', flex: 1, borderRadius: '8px' }}></div>
              <div className="sp-skeleton" style={{ height: '36px', flex: 1, borderRadius: '8px' }}></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
