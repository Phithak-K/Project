import React from 'react';

/**
 * โครงร่างระหว่างโหลดรายการออเดอร์
 * สไตล์ .sp-skeleton (เงาวิ่ง) ย้ายไปอยู่ใน globals.css §31.11 แล้ว
 * เพื่อให้ใช้ซ้ำได้ทุกหน้า และรองรับ Night Mode
 */
export default function OrderSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="sp-card"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="sp-skeleton" style={{ height: '20px', width: '120px' }}></div>
            <div className="sp-skeleton" style={{ height: '24px', width: '60px', borderRadius: '999px' }}></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="sp-skeleton" style={{ height: '40px', width: '40px', borderRadius: '50%' }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="sp-skeleton" style={{ height: '16px', width: '80%' }}></div>
              <div className="sp-skeleton" style={{ height: '14px', width: '50%' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div className="sp-skeleton" style={{ height: '36px', flex: 1, borderRadius: '12px' }}></div>
            <div className="sp-skeleton" style={{ height: '36px', flex: 1, borderRadius: '12px' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}
