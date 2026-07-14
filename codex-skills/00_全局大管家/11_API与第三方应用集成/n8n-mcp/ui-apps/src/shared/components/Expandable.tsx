import React from 'react';

interface ExpandableProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Expandable({ title, count, defaultOpen = false, children }: ExpandableProps) {
  return (
    <details open={defaultOpen} style={{
      marginBottom: '8px',
      border: '1px solid var(--n8n-border)',
      borderRadius: 'var(--n8n-radius)',
      overflow: 'hidden',
    }}>
      <summary style={{
        padding: '10px 14px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        background: 'var(--n8n-bg-card)',
        userSelect: 'none',
      }}>
        {title}
        {count !== undefined && (
          <span style={{ marginLeft: '8px', color: 'var(--n8n-text-muted)' }}>({count})</span>
        )}
      </summary>
      <div style={{ padding: '12px 14px' }}>
        {children}
      </div>
    </details>
  );
}
