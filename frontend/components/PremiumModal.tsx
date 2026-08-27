'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val?: string) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'danger' | 'prompt';
  placeholder?: string;
}

export default function PremiumModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'confirm',
  placeholder = 'กรอกข้อความ...',
}: PremiumModalProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'prompt' && !inputValue.trim()) return;
    onConfirm(type === 'prompt' ? inputValue : undefined);
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertTriangle size={28} style={{ color: 'var(--error-text)' }} />;
      case 'prompt': return <Info size={28} style={{ color: 'var(--brand-500)' }} />;
      default: return <CheckCircle size={28} style={{ color: 'var(--brand-500)' }} />;
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        borderRadius: '16px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        border: '1px solid var(--n-200)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem 1.5rem 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: type === 'danger' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(25, 118, 210, 0.1)',
              padding: '10px', borderRadius: '12px', display: 'flex'
            }}>
              {getIcon()}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--n-900)' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-400)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--n-600)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {message}
          </p>
          
          {type === 'prompt' && (
            <input 
              type="text" 
              className="sp-input" 
              placeholder={placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          background: 'var(--bg-body)', 
          borderTop: '1px solid var(--n-200)',
          display: 'flex', gap: '12px', justifyContent: 'flex-end'
        }}>
          <button 
            onClick={onClose}
            className="sp-btn-secondary"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className={type === 'danger' ? 'sp-btn-primary' : 'sp-btn-primary'}
            style={{ 
              padding: '0.6rem 1.2rem', borderRadius: '8px',
              backgroundColor: type === 'danger' ? 'var(--error-text)' : 'var(--brand-500)',
              color: '#fff', border: 'none'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}} />
    </div>
  );
}
