import React, { useState, useCallback } from 'react';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for sandboxed environments
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        padding: 0,
        border: '1px solid var(--n8n-border)',
        borderRadius: '4px',
        background: 'transparent',
        color: copied ? 'var(--n8n-success)' : 'var(--n8n-text-muted)',
        cursor: 'pointer',
        fontSize: '11px',
        lineHeight: 1,
        flexShrink: 0,
      }}
      title="Copy"
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}
