import React from 'react';
import '@shared/styles/theme.css';
import { Badge } from '@shared/components';
import { useToolData } from '@shared/hooks/useToolData';
import type { WorkflowListData } from '@shared/types';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function App() {
  const { data, error, isConnected } = useToolData<WorkflowListData>();

  if (error) {
    return <div style={{ padding: '16px', color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!isConnected) {
    return <div style={{ padding: '16px', color: 'var(--n8n-text-muted)' }}>Connecting...</div>;
  }

  if (!data) {
    return <div style={{ padding: '16px', color: 'var(--n8n-text-muted)' }}>Waiting for data...</div>;
  }

  if (!data.success && data.error) {
    return (
      <div style={{ maxWidth: '480px' }}>
        <Badge variant="error">Error</Badge>
        <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--n8n-error)' }}>{data.error}</div>
      </div>
    );
  }

  const workflows = data.data?.workflows ?? [];
  const returned = data.data?.returned ?? workflows.length;
  const hasMore = data.data?.hasMore;

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{
        fontSize: '12px',
        color: 'var(--color-text-secondary, var(--n8n-text-muted))',
        marginBottom: '10px',
      }}>
        Showing {returned} workflow{returned !== 1 ? 's' : ''}
        {hasMore && ' (more available)'}
      </div>

      <div style={{
        border: '1px solid var(--n8n-border)',
        borderRadius: 'var(--n8n-radius)',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 50px auto',
          gap: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.03em',
          color: 'var(--color-text-secondary, var(--n8n-text-muted))',
          background: 'var(--n8n-bg-card)',
          borderBottom: '1px solid var(--n8n-border)',
        }}>
          <span>Name</span>
          <span>Status</span>
          <span>Nodes</span>
          <span>Updated</span>
        </div>

        {workflows.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--n8n-text-muted)', fontSize: '13px' }}>
            No workflows found
          </div>
        )}

        {workflows.map((wf) => (
          <div
            key={wf.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 50px auto',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              borderBottom: '1px solid var(--n8n-border)',
              opacity: wf.isArchived ? 0.5 : 1,
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              <span style={{ fontWeight: 500 }}>{wf.name}</span>
              {wf.tags && wf.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                  {wf.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: 'var(--n8n-info-light)',
                      color: 'var(--n8n-info)',
                    }}>
                      {tag}
                    </span>
                  ))}
                  {wf.tags.length > 3 && (
                    <span style={{ fontSize: '10px', color: 'var(--n8n-text-muted)' }}>+{wf.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: wf.active ? 'var(--n8n-success)' : 'var(--n8n-border)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>
                {wf.isArchived ? 'Archived' : wf.active ? 'Active' : 'Off'}
              </span>
            </div>
            <span style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>
              {wf.nodeCount ?? '–'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, var(--n8n-text-muted))', whiteSpace: 'nowrap' as const }}>
              {formatDate(wf.updatedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
