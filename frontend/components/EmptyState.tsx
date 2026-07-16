import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="sp-empty-centered sp-animate" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'var(--n-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem'
      }}>
        <Icon size={36} style={{ color: 'var(--n-300)' }} />
      </div>
      <h3 className="sp-empty-title" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--n-800)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p className="sp-empty-body" style={{ color: 'var(--n-500)', fontSize: '0.875rem', maxWidth: '320px', margin: '0 auto' }}>
        {description}
      </p>
      
      {actionLabel && (
        <div style={{ marginTop: '2rem' }}>
          {actionHref ? (
            <Link href={actionHref} className="sp-btn-brand" style={{ display: 'inline-flex', padding: '0.75rem 2rem' }}>
              {actionLabel}
            </Link>
          ) : (
            <button onClick={onAction} className="sp-btn-brand" style={{ padding: '0.75rem 2rem' }}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
