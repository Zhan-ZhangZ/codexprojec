import { describe, it, expect, vi } from 'vitest';
import { n8nManagementTools } from '@/mcp/tools-n8n-manager';
import type {
  GenerateWorkflowHandler,
  GenerateWorkflowArgs,
  GenerateWorkflowResult,
  GenerateWorkflowProposal,
  GenerateWorkflowHelpers,
} from '@/types/generate-workflow';

describe('n8n_generate_workflow', () => {
  describe('tool definition', () => {
    const tool = n8nManagementTools.find((t) => t.name === 'n8n_generate_workflow');

    it('exists in n8nManagementTools', () => {
      expect(tool).toBeDefined();
    });

    it('has correct input schema', () => {
      expect(tool!.inputSchema.properties).toHaveProperty('description');
      expect(tool!.inputSchema.properties).toHaveProperty('skip_cache');
      expect(tool!.inputSchema.properties).toHaveProperty('deploy_id');
      expect(tool!.inputSchema.properties).toHaveProperty('confirm_deploy');
      expect(tool!.inputSchema.required).toEqual(['description']);
    });

    it('has correct annotations', () => {
      expect(tool!.annotations).toEqual({
        title: 'Generate Workflow',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      });
    });
  });

  describe('types', () => {
    it('GenerateWorkflowHandler accepts correct signature', () => {
      const handler: GenerateWorkflowHandler = async (args, context, helpers) => {
        return {
          success: true,
          source: 'generated',
          workflow_id: '123',
          workflow_name: 'Test',
          message: 'Done',
        };
      };
      expect(handler).toBeDefined();
    });

    it('GenerateWorkflowHelpers has required methods', () => {
      const helpers: GenerateWorkflowHelpers = {
        createWorkflow: vi.fn(),
        validateWorkflow: vi.fn(),
        autofixWorkflow: vi.fn(),
        getWorkflow: vi.fn(),
      };
      expect(helpers.createWorkflow).toBeDefined();
      expect(helpers.validateWorkflow).toBeDefined();
      expect(helpers.autofixWorkflow).toBeDefined();
      expect(helpers.getWorkflow).toBeDefined();
    });

    it('GenerateWorkflowResult supports both success and failure', () => {
      const success: GenerateWorkflowResult = {
        success: true,
        source: 'cache',
        workflow_id: 'abc',
        workflow_name: 'Test',
        workflow_url: 'https://example.com/workflow/abc',
        node_summary: 'Trigger → HTTP Request → Slack',
      };
      expect(success.success).toBe(true);

      const failure: GenerateWorkflowResult = {
        success: false,
        error: 'Generation failed',
        message: 'Try again',
      };
      expect(failure.success).toBe(false);
    });

    it('GenerateWorkflowResult supports proposal status', () => {
      const proposals: GenerateWorkflowResult = {
        success: true,
        status: 'proposals',
        proposals: [
          {
            id: 'uuid-1',
            name: 'Slack Reminder',
            description: 'Send scheduled Slack messages',
            flow_summary: 'Schedule Trigger → Set → Slack',
            credentials_needed: ['slackApi'],
          },
        ],
      };
      expect(proposals.status).toBe('proposals');
      expect(proposals.proposals).toHaveLength(1);
      expect(proposals.proposals![0].id).toBe('uuid-1');
    });

    it('GenerateWorkflowResult supports preview and deployed status', () => {
      const preview: GenerateWorkflowResult = {
        success: true,
        status: 'preview',
        node_summary: 'Webhook → HTTP Request → Slack',
      };
      expect(preview.status).toBe('preview');

      const deployed: GenerateWorkflowResult = {
        success: true,
        status: 'deployed',
        workflow_id: '123',
        workflow_name: 'My Workflow',
      };
      expect(deployed.status).toBe('deployed');
    });

    it('GenerateWorkflowProposal has required fields', () => {
      const proposal: GenerateWorkflowProposal = {
        id: 'uuid-123',
        name: 'Test Workflow',
        description: 'A test workflow',
        flow_summary: 'Trigger → Action',
        credentials_needed: ['slackApi', 'gmailOAuth2'],
      };
      expect(proposal.id).toBe('uuid-123');
      expect(proposal.credentials_needed).toHaveLength(2);
    });

    it('GenerateWorkflowArgs has description and optional fields', () => {
      const minimal: GenerateWorkflowArgs = { description: 'test' };
      expect(minimal.description).toBe('test');
      expect(minimal.skip_cache).toBeUndefined();
      expect(minimal.deploy_id).toBeUndefined();
      expect(minimal.confirm_deploy).toBeUndefined();

      const withSkip: GenerateWorkflowArgs = { description: 'test', skip_cache: true };
      expect(withSkip.skip_cache).toBe(true);

      const withDeploy: GenerateWorkflowArgs = { description: 'test', deploy_id: 'uuid-1' };
      expect(withDeploy.deploy_id).toBe('uuid-1');

      const withConfirm: GenerateWorkflowArgs = { description: 'test', confirm_deploy: true };
      expect(withConfirm.confirm_deploy).toBe(true);
    });
  });
});
