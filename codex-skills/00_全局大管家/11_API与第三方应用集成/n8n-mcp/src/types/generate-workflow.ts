import { InstanceContext } from './instance-context';

export interface GenerateWorkflowArgs {
  description: string;
  skip_cache?: boolean;
  deploy_id?: string;
  confirm_deploy?: boolean;
}

export interface GenerateWorkflowProposal {
  id: string;
  name: string;
  description: string;
  flow_summary: string;
  credentials_needed: string[];
}

export interface GenerateWorkflowResult {
  success: boolean;
  source?: 'cache' | 'generated';
  status?: 'proposals' | 'preview' | 'deployed' | 'error';
  proposals?: GenerateWorkflowProposal[];
  workflow_id?: string;
  workflow_name?: string;
  workflow_url?: string;
  node_count?: number;
  node_summary?: string;
  trigger_type?: string;
  error?: string;
  message?: string;
}

export type GenerateWorkflowHandler = (
  args: GenerateWorkflowArgs,
  context: InstanceContext,
  helpers: GenerateWorkflowHelpers
) => Promise<GenerateWorkflowResult>;

export interface GenerateWorkflowHelpers {
  createWorkflow(args: { name: string; nodes: any[]; connections: any }): Promise<any>;
  validateWorkflow(workflowId: string): Promise<any>;
  autofixWorkflow(workflowId: string): Promise<any>;
  getWorkflow(workflowId: string): Promise<any>;
}
