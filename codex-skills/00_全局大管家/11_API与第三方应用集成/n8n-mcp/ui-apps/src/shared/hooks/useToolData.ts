import { useState, useCallback } from 'react';
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react';
import type { App } from '@modelcontextprotocol/ext-apps/react';

interface UseToolDataResult<T> {
  data: T | null;
  error: string | null;
  isConnected: boolean;
  app: App | null;
  toolName: string | null;
}

export function useToolData<T>(): UseToolDataResult<T> {
  const [data, setData] = useState<T | null>(null);

  const onAppCreated = useCallback((app: App) => {
    app.ontoolresult = (result) => {
      if (result?.content) {
        const textItem = Array.isArray(result.content)
          ? result.content.find((c) => c.type === 'text')
          : null;
        if (textItem && 'text' in textItem) {
          try {
            setData(JSON.parse(textItem.text) as T);
          } catch {
            setData(textItem.text as unknown as T);
          }
        }
      }
    };
  }, []);

  const { app, isConnected, error } = useApp({
    appInfo: { name: 'n8n-mcp-ui', version: '1.0.0' },
    capabilities: {},
    onAppCreated,
  });

  useHostStyles(app, app?.getHostContext());

  const toolName = app?.getHostContext()?.toolInfo?.tool.name ?? null;

  return {
    data,
    error: error?.message ?? null,
    isConnected,
    app,
    toolName,
  };
}
