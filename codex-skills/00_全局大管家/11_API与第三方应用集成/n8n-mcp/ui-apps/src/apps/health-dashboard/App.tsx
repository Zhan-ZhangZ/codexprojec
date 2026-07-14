import React from 'react';
import '@shared/styles/theme.css';
import { Badge, Card } from '@shared/components';
import { useToolData } from '@shared/hooks/useToolData';
import type { HealthDashboardData } from '@shared/types';

export default function App() {
  const { data, error, isConnected } = useToolData<HealthDashboardData>();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Badge variant="error">Disconnected</Badge>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--n8n-error)' }}>{data.error}</div>
      </div>
    );
  }

  const d = data.data;
  const isConnectedStatus = d?.status === 'connected' || d?.status === 'ok' || data.success;
  const vc = d?.versionCheck;
  const perf = d?.performance;
  const nextSteps = d?.nextSteps ?? [];

  return (
    <div style={{ maxWidth: '480px' }}>
      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Badge variant={isConnectedStatus ? 'success' : 'error'}>
          {isConnectedStatus ? 'Connected' : 'Disconnected'}
        </Badge>
        {d?.apiUrl && (
          <span style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--color-text-secondary, var(--n8n-text-muted))',
          }}>
            {d.apiUrl}
          </span>
        )}
      </div>

      {/* Version info */}
      {(d?.n8nVersion || d?.mcpVersion) && (
        <Card>
          <div style={{ fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>n8n</span>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 }}>
                {d?.n8nVersion ?? '–'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>MCP Server</span>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 }}>
                {d?.mcpVersion ?? '–'}
              </span>
            </div>
            {vc && !vc.upToDate && (
              <div style={{
                marginTop: '8px',
                padding: '6px 10px',
                background: 'var(--n8n-warning-light)',
                borderRadius: '4px',
                fontSize: '12px',
                color: 'var(--n8n-warning)',
              }}>
                Update available: {vc.current} → {vc.latest}
                {vc.updateCommand && (
                  <div style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    marginTop: '4px',
                    opacity: 0.9,
                  }}>
                    {vc.updateCommand}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Performance */}
      {perf && (
        <Card>
          <div style={{ fontSize: '13px' }}>
            {perf.responseTimeMs !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>Response time</span>
                <span style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 500,
                  color: perf.responseTimeMs < 500 ? 'var(--n8n-success)' : perf.responseTimeMs < 2000 ? 'var(--n8n-warning)' : 'var(--n8n-error)',
                }}>
                  {perf.responseTimeMs}ms
                </span>
              </div>
            )}
            {perf.cacheHitRate !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>Cache hit rate</span>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 }}>
                  {typeof perf.cacheHitRate === 'number' && perf.cacheHitRate <= 1
                    ? `${(perf.cacheHitRate * 100).toFixed(0)}%`
                    : `${perf.cacheHitRate}%`}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Next steps */}
      {nextSteps.length > 0 && (
        <Card title="Next Steps">
          <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
            {nextSteps.map((step, i) => (
              <li key={i} style={{ padding: '2px 0' }}>{step}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
