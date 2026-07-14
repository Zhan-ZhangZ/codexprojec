import React from 'react';
import '@shared/styles/theme.css';
import { Badge, Expandable } from '@shared/components';
import { useToolData } from '@shared/hooks/useToolData';
import type { OperationResultData, OperationType } from '@shared/types';

const TOOL_TO_OP: Record<string, OperationType> = {
  n8n_create_workflow: 'create',
  n8n_update_full_workflow: 'update',
  n8n_update_partial_workflow: 'partial_update',
  n8n_delete_workflow: 'delete',
  n8n_test_workflow: 'test',
  n8n_autofix_workflow: 'autofix',
  n8n_deploy_template: 'deploy',
};

const OP_CONFIG: Record<OperationType, { icon: string; label: string; color: string }> = {
  create:         { icon: '+',  label: 'WORKFLOW CREATED',    color: 'var(--n8n-success)' },
  update:         { icon: '⟳',  label: 'WORKFLOW UPDATED',    color: 'var(--n8n-info)' },
  partial_update: { icon: '⟳',  label: 'WORKFLOW UPDATED',    color: 'var(--n8n-info)' },
  delete:         { icon: '−',  label: 'WORKFLOW DELETED',    color: 'var(--n8n-error)' },
  test:           { icon: '▶',  label: 'WORKFLOW TESTED',     color: 'var(--n8n-info)' },
  autofix:        { icon: '⚡', label: 'WORKFLOW AUTO-FIXED', color: 'var(--n8n-warning)' },
  deploy:         { icon: '↓',  label: 'TEMPLATE DEPLOYED',  color: 'var(--n8n-success)' },
};

function detectOperation(toolName: string | null, data: OperationResultData): OperationType {
  if (toolName && TOOL_TO_OP[toolName]) return TOOL_TO_OP[toolName];

  const d = data.data;
  if (d?.deleted) return 'delete';
  if (d?.templateId) return 'deploy';
  if (d?.fixesApplied !== undefined || d?.fixes) return 'autofix';
  if (d?.executionId) return 'test';
  if (d?.operationsApplied !== undefined) return 'partial_update';
  return 'create';
}

function PartialUpdatePanel({ details }: { details?: Record<string, unknown> }) {
  if (!details) return null;
  const applied = Array.isArray(details.applied) ? details.applied as string[] : [];
  const failed = Array.isArray(details.failed) ? details.failed as string[] : [];
  const warnings = Array.isArray(details.warnings) ? details.warnings as string[] : [];
  if (applied.length === 0 && failed.length === 0) return null;

  const items = [
    ...applied.map((m) => ({ icon: '✓', color: 'var(--n8n-success)', text: String(m) })),
    ...failed.map((m) => ({ icon: '✗', color: 'var(--n8n-error)', text: String(m) })),
    ...warnings.map((m) => ({ icon: '!', color: 'var(--n8n-warning)', text: String(m) })),
  ];

  const summary = (
    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, var(--n8n-text-muted))', marginBottom: '6px' }}>
      <span style={{ color: 'var(--n8n-success)' }}>{applied.length} applied</span>
      {failed.length > 0 && <>, <span style={{ color: 'var(--n8n-error)' }}>{failed.length} failed</span></>}
    </div>
  );

  const list = items.map((item, i) => (
    <div key={i} style={{ fontSize: '12px', padding: '2px 0', display: 'flex', gap: '6px' }}>
      <span style={{ color: item.color, flexShrink: 0 }}>{item.icon}</span>
      <span>{item.text}</span>
    </div>
  ));

  if (items.length > 5) {
    return <>{summary}<Expandable title="Operation Log" count={items.length}>{list}</Expandable></>;
  }
  return <>{summary}<div style={{ marginBottom: '8px' }}>{list}</div></>;
}

function AutofixPanel({ data }: { data: OperationResultData }) {
  const fixes = Array.isArray(data.data?.fixes) ? data.data!.fixes as Record<string, unknown>[] : [];
  const isPreview = data.data?.preview === true;
  const fixCount = data.data?.fixesApplied ?? fixes.length;

  return (
    <>
      {isPreview && (
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--n8n-warning)',
          background: 'var(--n8n-warning-light)',
          padding: '4px 10px',
          borderRadius: 'var(--n8n-radius)',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          PREVIEW MODE
        </div>
      )}
      {fixes.length > 0 && (
        <Expandable title="Fixes" count={fixCount} defaultOpen>
          {fixes.map((fix, i) => {
            const confidence = String(fix.confidence ?? '').toUpperCase();
            return (
              <div key={i} style={{
                fontSize: '12px',
                padding: '6px 8px',
                marginBottom: '4px',
                borderLeft: `3px solid ${confidence === 'HIGH' ? 'var(--n8n-success)' : 'var(--n8n-warning)'}`,
                paddingLeft: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{String(fix.description ?? fix.message ?? JSON.stringify(fix))}</span>
                  {confidence && (
                    <Badge variant={confidence === 'HIGH' ? 'success' : 'warning'}>
                      {confidence}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </Expandable>
      )}
    </>
  );
}

function DeployPanel({ data }: { data: OperationResultData }) {
  const d = data.data;
  const creds = Array.isArray(d?.requiredCredentials) ? d!.requiredCredentials as string[] : [];
  const triggerType = d?.triggerType;
  const autoFixStatus = d?.autoFixStatus;

  return (
    <div style={{ fontSize: '12px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: creds.length > 0 ? '8px' : 0 }}>
        {triggerType && <Badge variant="info">{String(triggerType)}</Badge>}
        {autoFixStatus && <Badge variant={autoFixStatus === 'success' ? 'success' : 'warning'}>{String(autoFixStatus)}</Badge>}
      </div>
      {creds.length > 0 && (
        <div>
          <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>Required credentials:</div>
          {creds.map((c, i) => (
            <div key={i} style={{ padding: '1px 0' }}>○ {c}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function TestPanel({ data }: { data: OperationResultData }) {
  const execId = data.data?.executionId;
  const triggerType = data.data?.triggerType;
  if (!execId && !triggerType) return null;
  return (
    <div style={{ fontSize: '12px', marginBottom: '8px' }}>
      {execId && (
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
          Execution: {execId}
        </div>
      )}
      {triggerType && <Badge variant="info">{String(triggerType)}</Badge>}
    </div>
  );
}

function ErrorDetails({ details }: { details?: Record<string, unknown> }) {
  if (!details) return null;

  if (Array.isArray(details.errors)) {
    const errs = details.errors as string[];
    return (
      <Expandable title="Errors" count={errs.length}>
        <ul style={{ paddingLeft: '16px', fontSize: '12px' }}>
          {errs.map((e, i) => <li key={i} style={{ padding: '1px 0' }}>{String(e)}</li>)}
        </ul>
      </Expandable>
    );
  }

  const entries = Object.entries(details).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;

  const hasComplexValues = entries.some(([, v]) => typeof v === 'object');
  if (hasComplexValues) {
    return (
      <Expandable title="Details">
        <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(details, null, 2)}
        </pre>
      </Expandable>
    );
  }

  return (
    <Expandable title="Details">
      <div style={{ fontSize: '12px' }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ padding: '2px 0' }}>
            <span style={{ color: 'var(--color-text-secondary, var(--n8n-text-muted))' }}>{key}: </span>
            <span>{String(val)}</span>
          </div>
        ))}
      </div>
    </Expandable>
  );
}

export default function App() {
  const { data, error, isConnected, toolName } = useToolData<OperationResultData>();

  if (error) {
    return <div style={{ padding: '16px', color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!isConnected) {
    return <div style={{ padding: '16px', color: 'var(--n8n-text-muted)' }}>Connecting...</div>;
  }

  if (!data) {
    return <div style={{ padding: '16px', color: 'var(--n8n-text-muted)' }}>Waiting for data...</div>;
  }

  const isSuccess = data.success === true;
  const op = detectOperation(toolName, data);
  const config = OP_CONFIG[op];

  const workflowName = data.data?.name || data.data?.workflowName;
  const workflowId = data.data?.id || data.data?.workflowId;
  const nodeCount = data.data?.nodeCount;
  const isActive = data.data?.active;
  const operationsApplied = data.data?.operationsApplied;
  const executionId = data.data?.executionId;
  const fixesApplied = data.data?.fixesApplied;
  const templateId = data.data?.templateId;

  const label = isSuccess ? config.label : config.label + ' FAILED';

  const metaParts: string[] = [];
  if (workflowId) metaParts.push(`ID: ${workflowId}`);
  if (nodeCount !== undefined) metaParts.push(`${nodeCount} nodes`);
  if (isActive !== undefined) metaParts.push(isActive ? 'active' : 'inactive');
  if (operationsApplied !== undefined) metaParts.push(`${operationsApplied} ops applied`);
  if (executionId) metaParts.push(`exec: ${executionId}`);
  if (fixesApplied !== undefined) metaParts.push(`${fixesApplied} fixes`);
  if (templateId) metaParts.push(`template: ${templateId}`);

  const containerStyle = op === 'delete' ? {
    maxWidth: '480px',
    borderLeft: '3px solid var(--n8n-error)',
    paddingLeft: '12px',
  } : { maxWidth: '480px' };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '18px',
            lineHeight: '24px',
            color: config.color,
            flexShrink: 0,
          }}>
            {config.icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              color: config.color,
              lineHeight: '16px',
            }}>
              {label}
            </div>
            {workflowName && (
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-primary, var(--n8n-text))',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}>
                {workflowName}
              </div>
            )}
            {metaParts.length > 0 && (
              <div style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-secondary, var(--n8n-text-muted))',
                marginTop: '2px',
              }}>
                {metaParts.join('  ·  ')}
              </div>
            )}
          </div>
        </div>
        <Badge variant={isSuccess ? 'success' : 'error'}>
          {isSuccess ? 'Success' : 'Error'}
        </Badge>
      </div>

      {/* Error info */}
      {!isSuccess && data.error && (
        <div style={{
          fontSize: '12px',
          color: 'var(--n8n-error)',
          padding: '8px 12px',
          background: 'var(--n8n-error-light)',
          borderRadius: 'var(--n8n-radius)',
          marginBottom: '8px',
        }}>
          {data.error}
        </div>
      )}

      {/* Operation-specific panels */}
      {isSuccess && op === 'partial_update' && <PartialUpdatePanel details={data.details} />}
      {isSuccess && op === 'autofix' && <AutofixPanel data={data} />}
      {isSuccess && op === 'deploy' && <DeployPanel data={data} />}
      {isSuccess && op === 'test' && <TestPanel data={data} />}

      {/* Error details */}
      {!isSuccess && <ErrorDetails details={data.details} />}

      {/* Fallback details for success states without specific panels */}
      {isSuccess && !['partial_update', 'autofix', 'deploy', 'test'].includes(op) && data.details && (
        <ErrorDetails details={data.details} />
      )}
    </div>
  );
}
