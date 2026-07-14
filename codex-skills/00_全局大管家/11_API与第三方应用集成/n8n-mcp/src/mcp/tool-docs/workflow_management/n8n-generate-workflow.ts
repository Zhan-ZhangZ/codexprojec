import { ToolDocumentation } from '../types';

export const n8nGenerateWorkflowDoc: ToolDocumentation = {
  name: 'n8n_generate_workflow',
  category: 'workflow_management',
  essentials: {
    description: 'Generate workflows from natural language. Three-step flow:\n' +
      '1. Call with description → get proposals\n' +
      '2. Call with deploy_id → deploy a proposal, OR skip_cache=true → fresh generation preview\n' +
      '3. Call with confirm_deploy=true → deploy the preview',
    keyParameters: ['description', 'skip_cache', 'deploy_id', 'confirm_deploy'],
    example: 'n8n_generate_workflow({description: "Send a Slack message every morning at 9am"})',
    performance: 'Network-dependent (2-15s depending on cache hit vs fresh generation)',
    tips: [
      'Include trigger type (webhook, schedule, manual) in the description',
      'Mention specific services to integrate (Slack, Gmail, Google Sheets, etc.)',
      'Review proposals before deploying — use deploy_id to pick one',
      'Use skip_cache=true to generate fresh, then confirm_deploy=true to deploy',
      'Available exclusively on the hosted version of n8n-mcp'
    ]
  },
  full: {
    description: 'Generates n8n workflows from natural language using a multi-step flow. ' +
      'Step 1: Call with description to get up to 5 proposals (not deployed). ' +
      'Step 2a: Call with deploy_id to deploy a chosen proposal. ' +
      'Step 2b: Call with skip_cache=true to generate a fresh workflow (returns preview, not deployed). ' +
      'Step 3: Call with confirm_deploy=true to deploy the preview. ' +
      'On self-hosted instances, returns a message directing users to the hosted service.',
    parameters: {
      description: { type: 'string', required: true, description: 'Clear description of what the workflow should do. Include: trigger type (webhook, schedule, manual), services to integrate (Slack, Gmail, etc.), and the logic/flow.' },
      skip_cache: { type: 'boolean', description: 'Set to true to skip proposals and generate a fresh workflow from scratch. Returns a preview — call again with confirm_deploy=true to deploy it.' },
      deploy_id: { type: 'string', description: 'ID of a proposal to deploy. Get proposal IDs from a previous call that returned status "proposals".' },
      confirm_deploy: { type: 'boolean', description: 'Set to true to deploy the workflow from the last generation preview.' }
    },
    returns: 'Object with success, status (proposals/preview/deployed/error), and context-dependent fields. ' +
      'For proposals: proposals[] with id, name, description, flow_summary, credentials_needed. ' +
      'For preview: workflow structure details. ' +
      'For deployed: workflow_id, workflow_name, workflow_url, node_count, node_summary. ' +
      'On self-hosted instances, returns hosted_only: true.',
    examples: [
      `// Step 1: Get proposals
n8n_generate_workflow({
  description: "Send a Slack message every morning at 9am with a daily standup reminder"
})
// Returns: { status: "proposals", proposals: [{ id: "uuid-1", name: "...", ... }, ...] }`,
      `// Step 2a: Deploy a chosen proposal
n8n_generate_workflow({
  description: "Send a Slack message every morning at 9am",
  deploy_id: "uuid-1"
})
// Returns: { status: "deployed", workflow_id: "123", ... }`,
      `// Step 2b: Fresh generation (skip cache)
n8n_generate_workflow({
  description: "Webhook that receives JSON data, transforms it, and posts to a REST API",
  skip_cache: true
})
// Returns: { status: "preview", ... }`,
      `// Step 3: Deploy the preview
n8n_generate_workflow({
  description: "Webhook that receives JSON data, transforms it, and posts to a REST API",
  confirm_deploy: true
})
// Returns: { status: "deployed", workflow_id: "456", ... }`
    ],
    useCases: [
      'Quickly create workflows from natural language descriptions',
      'Review proposals before deploying to maintain quality',
      'Generate complex multi-service integrations with agent oversight',
      'Create workflows without deep knowledge of n8n node configuration'
    ],
    performance: 'Proposals: ~2s. Fresh generation: 5-15s. Deploy: ~3s. All within typical MCP client timeout.',
    bestPractices: [
      'Be specific about trigger type and services in the description',
      'Review proposals before deploying — pick the best match with deploy_id',
      'Use skip_cache only when proposals do not match your needs',
      'After deployment, use n8n_validate_workflow to verify the result',
      'Configure credentials in n8n UI before activating'
    ],
    pitfalls: [
      '**Hosted-only feature** — self-hosted instances receive a redirect message',
      'Proposals are NOT deployed — you must call again with deploy_id or confirm_deploy',
      'Generated workflows are created in INACTIVE state',
      'Credentials must be configured manually in the n8n UI',
      'Session state for pending proposals/preview is per MCP session'
    ],
    relatedTools: ['n8n_create_workflow', 'n8n_deploy_template', 'n8n_validate_workflow', 'n8n_autofix_workflow', 'search_templates']
  }
};
