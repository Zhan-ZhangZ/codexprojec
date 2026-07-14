import { ToolDocumentation } from '../types';

export const searchTemplatesDoc: ToolDocumentation = {
  name: 'search_templates',
  category: 'templates',
  essentials: {
    description: 'Unified template search with multiple modes: keyword search, by node types, by task type, by metadata, or patterns. 2,700+ templates available.',
    keyParameters: ['searchMode', 'query', 'nodeTypes', 'task', 'limit'],
    example: 'search_templates({searchMode: "by_task", task: "webhook_processing"})',
    performance: 'Fast (<100ms) - FTS5 full-text search',
    tips: [
      'searchMode="keyword" (default): Search by name/description',
      'searchMode="by_nodes": Find templates using specific nodes',
      'searchMode="by_task": Get curated templates for common tasks',
      'searchMode="by_metadata": Filter by complexity, services, audience',
      'searchMode="patterns": Workflow pattern summaries across 10 task categories',
      'patterns without task: overview of all categories. patterns with task: node frequencies + connection chains'
    ]
  },
  full: {
    description: `**Search Modes:**
- keyword (default): Full-text search across template names and descriptions
- by_nodes: Find templates that use specific node types
- by_task: Get curated templates for predefined task categories
- by_metadata: Filter by complexity, setup time, required services, or target audience
- patterns: Lightweight workflow pattern summaries mined from 2,700+ templates

**Available Task Types (for searchMode="by_task" and "patterns"):**
ai_automation, data_sync, webhook_processing, email_automation, slack_integration, data_transformation, file_processing, scheduling, api_integration, database_operations`,
    parameters: {
      searchMode: {
        type: 'string',
        required: false,
        description: 'Search mode: "keyword" (default), "by_nodes", "by_task", "by_metadata", "patterns"'
      },
      query: {
        type: 'string',
        required: false,
        description: 'For searchMode=keyword: Search keywords (e.g., "chatbot", "automation")'
      },
      nodeTypes: {
        type: 'array',
        required: false,
        description: 'For searchMode=by_nodes: Array of node types (e.g., ["n8n-nodes-base.httpRequest", "n8n-nodes-base.slack"])'
      },
      task: {
        type: 'string',
        required: false,
        description: 'For searchMode=by_task: Task type. For searchMode=patterns: optional category filter (omit for overview of all categories). Values: ai_automation, data_sync, webhook_processing, email_automation, slack_integration, data_transformation, file_processing, scheduling, api_integration, database_operations'
      },
      complexity: {
        type: 'string',
        required: false,
        description: 'For searchMode=by_metadata: Filter by complexity ("simple", "medium", "complex")'
      },
      maxSetupMinutes: {
        type: 'number',
        required: false,
        description: 'For searchMode=by_metadata: Maximum setup time in minutes (5-480)'
      },
      minSetupMinutes: {
        type: 'number',
        required: false,
        description: 'For searchMode=by_metadata: Minimum setup time in minutes (5-480)'
      },
      requiredService: {
        type: 'string',
        required: false,
        description: 'For searchMode=by_metadata: Filter by required service (e.g., "openai", "slack", "google")'
      },
      targetAudience: {
        type: 'string',
        required: false,
        description: 'For searchMode=by_metadata: Filter by target audience (e.g., "developers", "marketers")'
      },
      category: {
        type: 'string',
        required: false,
        description: 'For searchMode=by_metadata: Filter by category (e.g., "automation", "integration")'
      },
      fields: {
        type: 'array',
        required: false,
        description: 'For searchMode=keyword: Fields to include (id, name, description, author, nodes, views, created, url, metadata)'
      },
      limit: {
        type: 'number',
        required: false,
        description: 'Maximum results (default 20, max 100)'
      },
      offset: {
        type: 'number',
        required: false,
        description: 'Pagination offset (default 0)'
      }
    },
    returns: `For keyword/by_nodes/by_task/by_metadata modes:
- templates: Array of matching templates
  - id: Template ID for get_template()
  - name, description, author, nodes, views, created, url, metadata
- totalFound: Total matching templates
- searchMode: The mode used

For patterns mode (no task):
- templateCount, generatedAt
- categories: Array of {category, templateCount, pattern, topNodes}
- tip: How to drill into a specific category

For patterns mode (with task):
- category, templateCount, pattern
- nodes: Array of {type, freq, role} (top nodes by frequency, limited by 'limit')
- chains: Array of {path, count, freq} (top 5 connection chains, short node names)`,
    examples: [
      '// Keyword search (default)\nsearch_templates({query: "chatbot"})',
      '// Find templates using specific nodes\nsearch_templates({searchMode: "by_nodes", nodeTypes: ["n8n-nodes-base.httpRequest", "n8n-nodes-base.slack"]})',
      '// Get templates for a task type\nsearch_templates({searchMode: "by_task", task: "webhook_processing"})',
      '// Filter by metadata\nsearch_templates({searchMode: "by_metadata", complexity: "simple", requiredService: "openai"})',
      '// Combine metadata filters\nsearch_templates({searchMode: "by_metadata", maxSetupMinutes: 30, targetAudience: "developers"})',
      '// Pattern overview — all categories with top nodes (~550 tokens)\nsearch_templates({searchMode: "patterns"})',
      '// Detailed patterns for a category — node frequencies + connection chains\nsearch_templates({searchMode: "patterns", task: "ai_automation"})'
    ],
    useCases: [
      'Find workflows by business purpose (keyword search)',
      'Find templates using specific integrations (by_nodes)',
      'Get pre-built solutions for common tasks (by_task)',
      'Filter by complexity for team skill level (by_metadata)',
      'Understand common workflow shapes before building (patterns)',
      'Architecture planning — which nodes go together (patterns)'
    ],
    performance: `Fast performance across all modes:
- keyword: <50ms with FTS5 indexing
- by_nodes: <100ms with indexed lookups
- by_task: <50ms from curated cache
- by_metadata: <100ms with filtered queries
- patterns: <10ms (pre-mined, cached in memory)`,
    bestPractices: [
      'Use searchMode="by_task" for common automation patterns',
      'Use searchMode="by_nodes" when you know which integrations you need',
      'Use searchMode="keyword" for general discovery',
      'Combine by_metadata filters for precise matching',
      'Use get_template(id) to get the full workflow JSON'
    ],
    pitfalls: [
      'searchMode="keyword" searches names/descriptions, not node types',
      'by_nodes requires full node type with prefix (n8n-nodes-base.xxx)',
      'by_metadata filters may return fewer results',
      'Not all templates have complete metadata'
    ],
    relatedTools: ['get_template', 'search_nodes', 'validate_workflow']
  }
};