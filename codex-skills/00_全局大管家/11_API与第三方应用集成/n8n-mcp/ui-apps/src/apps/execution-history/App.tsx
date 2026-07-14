import React, { useMemo } from 'react';
import '@shared/styles/theme.css';
import { Badge } from '@shared/components';
import { useToolData } from '@shared/hooks/useToolData';
import type { ExecutionHistoryData } from '@shared/types';

type ExecStatus = 'success' | 'error' | 'waiting' | 'running' | 'unknown';

function getStatusInfo(status?: string): { variant: 'success' | 'error' | 'warning' | 'info'; label: string } {
  switch (status) {
    case 'success': return { variant: 'success', label: 'Success' };
    case 'error': case 'failed': case 'crashed': return { variant: 'error', label: 'Error' };
    case 'waiting': return { variant: 'warning', label: 'Waiting' };
    case 'running': return { variant: 'info', label: 'Running' };
    default: return { variant: 'info', label: status ?? 'Unknown' };
  }
}

function formatDuration(startedAt?: string, stoppedAt?: string): string {
  if (!startedAt || !stoppedAt) return '–';
  try {
    const ms = new Date(stoppedAt).getTime() - new Date(startedAt).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  } catch {
    return '–';
  }
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function classifyStatus(status?: string): ExecStatus {
  switch (status) {
    case 'success': return 'success';
    case 'error': case 'failed': case 'crashed': return 'error';
    case 'waiting': return 'waiting';
    case 'running': return 'running';
    default: return 'unknown';
  }
}

export default function App() {
  const { data, error, isConnected } = useToolData<ExecutionHistoryData>();

  const executions = data?.data?.executions ?? [];

  const summary = useMemo(() => {
    const counts: Record<ExecStatus, number> = { success: 0, error: 0, waiting: 0, running: 0, unknown: 0 };
    for (const ex of executions) {
      counts[classifyStatus(ex.status)]++;
    }
    return counts;
  }, [executions]);

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

  const total = executions.length;
  const barSegments: { color: string; pct: number }[] = [];
  if (total > 0) {
    if (summary.success > 0) barSegments.push({ color: 'var(--n8n-success)', pct: (summary.success / total) * 100 });
    if (summary.error > 0) barSegments.push({ color: 'var(--n8n-error)', pct: (summary.error / total) * 100 });
    if (summary.waiting > 0) barSegments.push({ color: 'var(--n8n-warning)', pct: (summary.waiting / total) * 100 });
    if (summary.running > 0) barSegments.push({ color: 'var(--n8n-info)', pct: (summary.running / total) * 100 });
    if (summary.unknown > 0) barSegments.push({ color: 'var(--n8n-border)', pct: (summary.unknown / total) * 100 });
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      {/* Summary bar */}
      {total > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            height: '6px',
            borderRadius: '3px',
            background: 'var(--n8n-border)',
            overflow: 'hidden',
            display: 'flex',
          }}>
            {barSegments.map((seg, i) => (
              <div key={i} style={{ width: `${seg.pct}%`, background: seg.color, minWidth: '3px' }} />
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, var(--n8n-text-muted))', marginTop: '6px' }}>
            {summary.success > 0 && <><span style={{ color: 'var(--n8n-success)', fontWeight: 500 }}>{summary.success}</span> succeeded</>}
            {summary.error > 0 && <>{summary.success > 0 && ', '}<span style={{ color: 'var(--n8n-error)', fontWeight: 500 }}>{summary.error}</span> failed</>}
            {summary.waiting > 0 && <>{(summary.success > 0 || summary.error > 0) && ', '}<span style={{ color: 'var(--n8n-warning)', fontWeight: 500 }}>{summary.waiting}</span> waiting</>}
            {summary.running > 0 && <>{(summary.success > 0 || summary.error > 0 || summary.waiting > 0) && ', '}<span style={{ color: 'var(--n8n-info)', fontWeight: 500 }}>{summary.running}</span> running</>}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        border: '1px solid var(--n8n-border)',
        borderRadius: 'var(--n8n-radius)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '70px 1fr 70px 90px 60px',
          gap: '6px',
          padding: '8px 10px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.03em',
          color: 'var(--color-text-secondary, var(--n8n-text-muted))',
          background: 'var(--n8n-bg-card)',
          borderBottom: '1px solid var(--n8n-border)',
        }}>
          <span>ID</span>
          <span>Workflow</span>
          <span>Status</span>
          <span>Started</span>
          <span>Duration</span>
        </div>

        {executions.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--n8n-text-muted)', fontSize: '13px' }}>
            No executions found
          </div>
        )}

        {executions.map((ex) => {
          const statusInfo = getStatusInfo(ex.status);
          return (
            <div
              key={ex.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 70px 90px 60px',
                gap: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                borderBottom: '1px solid var(--n8n-border)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
                {ex.id.length > 8 ? ex.id.slice(0, 8) + '…' : ex.id}
              </span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}>
                {ex.workflowName || ex.workflowId || '–'}
              </span>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, var(--n8n-text-muted))', whiteSpace: 'nowrap' as const }}>
                {formatTime(ex.startedAt)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>
                {formatDuration(ex.startedAt, ex.stoppedAt)}
              </span>
            </div>
          );
        })}
      </div>

      {data.data?.hasMore && (
        <div style={{
          fontSize: '11px',
          color: 'var(--color-text-secondary, var(--n8n-text-muted))',
          marginTop: '6px',
          textAlign: 'center',
        }}>
          More executions available
        </div>
      )}
    </div>
  );
}
