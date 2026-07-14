import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { N8NDocumentationMCPServer } from '../../../src/mcp/server';

// Mock the database and dependencies
vi.mock('../../../src/database/database-adapter');
vi.mock('../../../src/database/node-repository');
vi.mock('../../../src/templates/template-service');
vi.mock('../../../src/utils/logger');

class TestableN8NMCPServer extends N8NDocumentationMCPServer {
  public testCoerceStringifiedJsonParams(
    toolName: string,
    args: Record<string, any>
  ): Record<string, any> {
    return (this as any).coerceStringifiedJsonParams(toolName, args);
  }
}

describe('coerceStringifiedJsonParams', () => {
  let server: TestableN8NMCPServer;

  beforeEach(() => {
    process.env.NODE_DB_PATH = ':memory:';
    server = new TestableN8NMCPServer();
  });

  afterEach(() => {
    delete process.env.NODE_DB_PATH;
  });

  describe('Object coercion', () => {
    it('should coerce stringified object for validate_node config', () => {
      const args = {
        nodeType: 'nodes-base.slack',
        config: '{"resource":"channel","operation":"create"}'
      };
      const result = server.testCoerceStringifiedJsonParams('validate_node', args);
      expect(result.config).toEqual({ resource: 'channel', operation: 'create' });
      expect(result.nodeType).toBe('nodes-base.slack');
    });

    it('should coerce stringified object for n8n_create_workflow connections', () => {
      const connections = { 'Webhook': { main: [[{ node: 'Slack', type: 'main', index: 0 }]] } };
      const args = {
        name: 'Test Workflow',
        nodes: [{ id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
        connections: JSON.stringify(connections)
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_create_workflow', args);
      expect(result.connections).toEqual(connections);
    });

    it('should coerce stringified object for validate_workflow workflow param', () => {
      const workflow = { nodes: [], connections: {} };
      const args = {
        workflow: JSON.stringify(workflow)
      };
      const result = server.testCoerceStringifiedJsonParams('validate_workflow', args);
      expect(result.workflow).toEqual(workflow);
    });
  });

  describe('Array coercion', () => {
    it('should coerce stringified array for n8n_update_partial_workflow operations', () => {
      const operations = [
        { type: 'addNode', node: { id: '1', name: 'Test', type: 'n8n-nodes-base.noOp' } }
      ];
      const args = {
        id: '123',
        operations: JSON.stringify(operations)
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_update_partial_workflow', args);
      expect(result.operations).toEqual(operations);
      expect(result.id).toBe('123');
    });

    it('should coerce stringified array for n8n_autofix_workflow fixTypes', () => {
      const fixTypes = ['expression-format', 'typeversion-correction'];
      const args = {
        id: '456',
        fixTypes: JSON.stringify(fixTypes)
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_autofix_workflow', args);
      expect(result.fixTypes).toEqual(fixTypes);
    });
  });

  describe('No-op cases', () => {
    it('should not modify object params that are already objects', () => {
      const config = { resource: 'channel', operation: 'create' };
      const args = {
        nodeType: 'nodes-base.slack',
        config
      };
      const result = server.testCoerceStringifiedJsonParams('validate_node', args);
      expect(result.config).toEqual(config);
      expect(result.config).toBe(config); // same reference
    });

    it('should not modify string params even if they contain JSON', () => {
      const args = {
        query: '{"some":"json"}',
        limit: 10
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result.query).toBe('{"some":"json"}');
    });

    it('should not modify args for tools with no object/array params', () => {
      const args = {
        query: 'webhook',
        limit: 20,
        mode: 'OR'
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result).toEqual(args);
    });
  });

  describe('Safety cases', () => {
    it('should keep original string for invalid JSON', () => {
      const args = {
        nodeType: 'nodes-base.slack',
        config: '{invalid json here}'
      };
      const result = server.testCoerceStringifiedJsonParams('validate_node', args);
      expect(result.config).toBe('{invalid json here}');
    });

    it('should not attempt parse when object param starts with [', () => {
      const args = {
        nodeType: 'nodes-base.slack',
        config: '[1, 2, 3]'
      };
      const result = server.testCoerceStringifiedJsonParams('validate_node', args);
      expect(result.config).toBe('[1, 2, 3]');
    });

    it('should not attempt parse when array param starts with {', () => {
      const args = {
        id: '123',
        operations: '{"not":"an array"}'
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_update_partial_workflow', args);
      expect(result.operations).toBe('{"not":"an array"}');
    });

    it('should handle null args gracefully', () => {
      const result = server.testCoerceStringifiedJsonParams('validate_node', null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined args gracefully', () => {
      const result = server.testCoerceStringifiedJsonParams('validate_node', undefined as any);
      expect(result).toBeUndefined();
    });

    it('should return args unchanged for unknown tool', () => {
      const args = { config: '{"key":"value"}' };
      const result = server.testCoerceStringifiedJsonParams('nonexistent_tool', args);
      expect(result).toEqual(args);
      expect(result.config).toBe('{"key":"value"}');
    });
  });

  describe('Number coercion', () => {
    it('should coerce string to number for search_nodes limit', () => {
      const args = {
        query: 'webhook',
        limit: '10'
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result.limit).toBe(10);
      expect(result.query).toBe('webhook');
    });

    it('should coerce string to number for n8n_executions limit', () => {
      const args = {
        action: 'list',
        limit: '50'
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_executions', args);
      expect(result.limit).toBe(50);
    });

    it('should not coerce non-numeric string to number', () => {
      const args = {
        query: 'webhook',
        limit: 'abc'
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result.limit).toBe('abc');
    });
  });

  describe('Boolean coercion', () => {
    it('should coerce "true" string to boolean', () => {
      const args = {
        query: 'webhook',
        includeExamples: 'true'
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result.includeExamples).toBe(true);
    });

    it('should coerce "false" string to boolean', () => {
      const args = {
        query: 'webhook',
        includeExamples: 'false'
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result.includeExamples).toBe(false);
    });

    it('should not coerce non-boolean string to boolean', () => {
      const args = {
        query: 'webhook',
        includeExamples: 'yes'
      };
      const result = server.testCoerceStringifiedJsonParams('search_nodes', args);
      expect(result.includeExamples).toBe('yes');
    });
  });

  describe('Number-to-string coercion', () => {
    it('should coerce number to string for n8n_get_workflow id', () => {
      const args = {
        id: 123,
        mode: 'minimal'
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_get_workflow', args);
      expect(result.id).toBe('123');
      expect(result.mode).toBe('minimal');
    });

    it('should coerce boolean to string when string expected', () => {
      const args = {
        id: true
      };
      const result = server.testCoerceStringifiedJsonParams('n8n_get_workflow', args);
      expect(result.id).toBe('true');
    });
  });

  describe('End-to-end Claude Desktop scenario', () => {
    it('should coerce all stringified params for n8n_create_workflow', () => {
      const nodes = [
        {
          id: 'webhook_1',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: { httpMethod: 'POST', path: 'slack-notify' }
        },
        {
          id: 'slack_1',
          name: 'Slack',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [450, 300],
          parameters: { resource: 'message', operation: 'post', channel: '#general' }
        }
      ];
      const connections = {
        'Webhook': { main: [[{ node: 'Slack', type: 'main', index: 0 }]] }
      };
      const settings = { executionOrder: 'v1', timezone: 'America/New_York' };

      // Simulate Claude Desktop sending all object/array params as strings
      const args = {
        name: 'Webhook to Slack',
        nodes: JSON.stringify(nodes),
        connections: JSON.stringify(connections),
        settings: JSON.stringify(settings)
      };

      const result = server.testCoerceStringifiedJsonParams('n8n_create_workflow', args);

      expect(result.name).toBe('Webhook to Slack');
      expect(result.nodes).toEqual(nodes);
      expect(result.connections).toEqual(connections);
      expect(result.settings).toEqual(settings);
    });

    it('should handle mixed type mismatches from Claude Desktop', () => {
      // Simulate Claude Desktop sending object params as strings
      const args = {
        nodeType: 'nodes-base.httpRequest',
        config: '{"method":"GET","url":"https://example.com"}',
        mode: 'full',
        profile: 'ai-friendly'
      };
      const result = server.testCoerceStringifiedJsonParams('validate_node', args);
      expect(result.config).toEqual({ method: 'GET', url: 'https://example.com' });
      expect(result.nodeType).toBe('nodes-base.httpRequest');
      expect(result.mode).toBe('full');
    });
  });
});
