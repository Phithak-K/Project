import React from 'react';

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon?: React.ReactNode, 
  title: string, 
  description: string, 
  action?: React.ReactNode 
}) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '4rem 2rem', 
      textAlign: 'center',
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--n-200)',
      animation: 'fade-in 0.3s ease-out'
    }}>
      {icon && (
        <div style={{ 
          marginBottom: '1.5rem', 
          color: 'var(--n-300)',
          background: 'var(--n-50)',
          padding: '1.5rem',
          borderRadius: '50%'
        }}>
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--n-800)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--n-500)', fontSize: '0.875rem', maxWidth: '300px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
