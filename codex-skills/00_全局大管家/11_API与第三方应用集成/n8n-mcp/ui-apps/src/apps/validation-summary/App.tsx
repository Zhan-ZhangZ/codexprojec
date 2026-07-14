import React, { useMemo } from 'react';
import '@shared/styles/theme.css';
import { Badge, Expandable } from '@shared/components';
import { useToolData } from '@shared/hooks/useToolData';
import type { ValidationSummaryData, ValidationError, ValidationWarning } from '@shared/types';

interface NodeGroup {
  node: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function SeverityBar({ errorCount, warningCount }: { errorCount: number; warningCount: number }) {
  const total = errorCount + warningCount;

  if (total === 0) {
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          height: '6px',
          borderRadius: '3px',
          background: 'var(--n8n-success)',
          marginBottom: '6px',
        }} />
        <div style={{ fontSize: '12px', color: 'var(--n8n-success)', fontWeight: 500 }}>
          All checks passed
        </div>
      </div>
    );
  }

  const errorPct = (errorCount / total) * 100;
  const warningPct = (warningCount / total) * 100;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: 'var(--n8n-border)',
        overflow: 'hidden',
        display: 'flex',
      }}>
        {errorCount > 0 && (
          <div style={{ width: `${errorPct}%`, background: 'var(--n8n-error)', minWidth: '4px' }} />
        )}
        {warningCount > 0 && (
          <div style={{ width: `${warningPct}%`, background: 'var(--n8n-warning)', minWidth: '4px' }} />
        )}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, var(--n8n-text-muted))', marginTop: '6px' }}>
        <span style={{ color: 'var(--n8n-error)', fontWeight: 500 }}>{errorCount}</span> error{errorCount !== 1 ? 's' : ''}
        {' · '}
        <span style={{ color: 'var(--n8n-warning)', fontWeight: 500 }}>{warningCount}</span> warning{warningCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function IssueItem({ issue, variant }: { issue: ValidationError | ValidationWarning; variant: 'error' | 'warning' }) {
  const color = variant === 'error' ? 'var(--n8n-error)' : 'var(--n8n-warning)';
  const fix = 'fix' in issue ? issue.fix : undefined;

  return (
    <div style={{
      padding: '6px 10px',
      marginBottom: '4px',
      borderLeft: `3px solid ${color}`,
      fontSize: '12px',
    }}>
      <div style={{ color: 'var(--color-text-primary, var(--n8n-text))' }}>{issue.message}</div>
      {issue.property && (
        <div style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))', fontSize: '11px', marginTop: '2px' }}>
          {issue.property}
        </div>
      )}
      {fix && (
        <div style={{ color, fontSize: '11px', marginTop: '2px' }}>
          → {fix}
        </div>
      )}
    </div>
  );
}

function NodeGroupSection({ group }: { group: NodeGroup }) {
  const errCount = group.errors.length;
  const warnCount = group.warnings.length;

  return (
    <Expandable
      title={group.node}
      count={errCount + warnCount}
      defaultOpen={errCount > 0}
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {errCount > 0 && <Badge variant="error">{errCount} error{errCount !== 1 ? 's' : ''}</Badge>}
        {warnCount > 0 && <Badge variant="warning">{warnCount} warning{warnCount !== 1 ? 's' : ''}</Badge>}
      </div>
      {group.errors.map((err, i) => (
        <IssueItem key={`e-${i}`} issue={err} variant="error" />
      ))}
      {group.warnings.map((warn, i) => (
        <IssueItem key={`w-${i}`} issue={warn} variant="warning" />
      ))}
    </Expandable>
  );
}

export default function App() {
  const { data: raw, error, isConnected } = useToolData<ValidationSummaryData>();

  const inner = raw?.data || raw;
  const errors: ValidationError[] = inner?.errors || raw?.errors || [];
  const warnings: ValidationWarning[] = inner?.warnings || raw?.warnings || [];

  const nodeGroups = useMemo(() => {
    if (errors.length === 0 && warnings.length === 0) return null;
    const hasNodes = errors.some((e) => e.node) || warnings.some((w) => w.node);
    const uniqueNodes = new Set([
      ...errors.filter((e) => e.node).map((e) => e.node!),
      ...warnings.filter((w) => w.node).map((w) => w.node!),
    ]);
    if (!hasNodes || uniqueNodes.size <= 1) return null;

    const groups: NodeGroup[] = [];
    for (const node of uniqueNodes) {
      groups.push({
        node,
        errors: errors.filter((e) => e.node === node),
        warnings: warnings.filter((w) => w.node === node),
      });
    }
    // Ungrouped items
    const ungroupedErrors = errors.filter((e) => !e.node);
    const ungroupedWarnings = warnings.filter((w) => !w.node);
    if (ungroupedErrors.length > 0 || ungroupedWarnings.length > 0) {
      groups.push({ node: 'General', errors: ungroupedErrors, warnings: ungroupedWarnings });
    }
    // Sort: most issues first
    groups.sort((a, b) => (b.errors.length + b.warnings.length) - (a.errors.length + a.warnings.length));
    return groups;
  }, [errors, warnings]);

  if (error) {
    return <div style={{ padding: '16px', color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!isConnected) {
    return <div style={{ padding: '16px', color: 'var(--n8n-text-muted)' }}>Connecting...</div>;
  }

  if (!raw) {
    return <div style={{ padding: '16px', color: 'var(--n8n-text-muted)' }}>Waiting for data...</div>;
  }

  const valid = inner.valid ?? raw.valid ?? false;
  const displayName = raw.displayName || raw.data?.workflowName;
  const suggestions: string[] = inner?.suggestions || raw?.suggestions || [];
  const errorCount = raw.summary?.errorCount ?? inner?.summary?.errorCount ?? errors.length;
  const warningCount = raw.summary?.warningCount ?? inner?.summary?.warningCount ?? warnings.length;

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Badge variant={valid ? 'success' : 'error'}>
          {valid ? 'Valid' : 'Invalid'}
        </Badge>
        {displayName && (
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>{displayName}</span>
        )}
      </div>

      <SeverityBar errorCount={errorCount} warningCount={warningCount} />

      {nodeGroups ? (
        nodeGroups.map((group) => (
          <NodeGroupSection key={group.node} group={group} />
        ))
      ) : (
        <>
          {errors.length > 0 && (
            <Expandable title="Errors" count={errors.length} defaultOpen>
              {errors.map((err, i) => (
                <IssueItem key={i} issue={err} variant="error" />
              ))}
            </Expandable>
          )}

          {warnings.length > 0 && (
            <Expandable title="Warnings" count={warnings.length}>
              {warnings.map((warn, i) => (
                <IssueItem key={i} issue={warn} variant="warning" />
              ))}
            </Expandable>
          )}
        </>
      )}

      {suggestions.length > 0 && (
        <Expandable title="Suggestions" count={suggestions.length}>
          <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
            {suggestions.map((suggestion, i) => (
              <li key={i} style={{ padding: '2px 0', color: 'var(--n8n-info)' }}>→ {suggestion}</li>
            ))}
          </ul>
        </Expandable>
      )}
    </div>
  );
}
