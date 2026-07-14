import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div style={{
      background: 'var(--n8n-bg-card)',
      border: '1px solid var(--n8n-border)',
      borderRadius: 'var(--n8n-radius)',
      padding: '16px',
      marginBottom: '12px',
    }}>
      {title && (
        <h3 style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--n8n-text-muted)' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
