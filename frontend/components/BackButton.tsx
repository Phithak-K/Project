'use client';

import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="sp-btn-ghost"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1.5rem',
        cursor: 'pointer',
      }}
    >
      <ArrowLeft size={16} />
      ย้อนกลับ
    </button>
  );
}
