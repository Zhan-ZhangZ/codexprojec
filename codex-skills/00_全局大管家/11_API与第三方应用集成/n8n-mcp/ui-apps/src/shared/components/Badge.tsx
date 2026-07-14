import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: 'var(--n8n-success-light)', color: 'var(--n8n-success)' },
  warning: { bg: 'var(--n8n-warning-light)', color: 'var(--n8n-warning)' },
  error: { bg: 'var(--n8n-error-light)', color: 'var(--n8n-error)' },
  info: { bg: 'var(--n8n-info-light)', color: 'var(--n8n-info)' },
};

export function Badge({ variant, children }: BadgeProps) {
  const style = variantStyles[variant];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      background: style.bg,
      color: style.color,
    }}>
      {children}
    </span>
  );
}
