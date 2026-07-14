#!/usr/bin/env node
import { createDatabaseAdapter } from '../database/database-adapter';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

// Node types to exclude from analysis
const EXCLUDED_TYPES = new Set([
  'n8n-nodes-base.stickyNote',
  'n8n-nodes-base.noOp',
  'n8n-nodes-base.manualTrigger',
]);

// Category-to-node mapping for classification
const TASK_NODE_MAPPING: Record<string, string[]> = {
  ai_automation: [
    'nodes-langchain.agent', 'nodes-langchain.openAi', 'nodes-langchain.chainLlm',
    'nodes-langchain.lmChatOpenAi', 'nodes-langchain.lmChatAnthropic',
    'nodes-langchain.chainSummarization', 'nodes-langchain.toolWorkflow',
    'nodes-langchain.memoryBufferWindow', 'nodes-langchain.outputParserStructured',
  ],
  webhook_processing: [
    'nodes-base.webhook', 'nodes-base.respondToWebhook',
  ],
  email_automation: [
    'nodes-base.gmail', 'nodes-base.emailSend', 'nodes-base.microsoftOutlook',
    'nodes-base.emailReadImap',
  ],
  slack_integration: [
    'nodes-base.slack', 'nodes-base.slackTrigger',
  ],
  data_sync: [
    'nodes-base.googleSheets', 'nodes-base.airtable', 'nodes-base.postgres',
    'nodes-base.mysql', 'nodes-base.mongoDb',
  ],
  data_transformation: [
    'nodes-base.set', 'nodes-base.code', 'nodes-base.splitInBatches',
    'nodes-base.merge', 'nodes-base.itemLists', 'nodes-base.filter',
    'nodes-base.if', 'nodes-base.switch',
  ],
  scheduling: [
    'nodes-base.scheduleTrigger', 'nodes-base.cron',
  ],
  api_integration: [
    'nodes-base.httpRequest', 'nodes-base.webhook', 'nodes-base.graphql',
  ],
  database_operations: [
    'nodes-base.postgres', 'nodes-base.mongoDb', 'nodes-base.redis',
    'nodes-base.mysql', 'nodes-base.mySql',
  ],
  file_processing: [
    'nodes-base.readBinaryFiles', 'nodes-base.writeBinaryFile',
    'nodes-base.spreadsheetFile', 'nodes-base.googleDrive',
  ],
};

// Display name mapping for common node types (used for pattern strings)
const DISPLAY_NAMES: Record<string, string> = {
  'n8n-nodes-base.webhook': 'Webhook',
  'n8n-nodes-base.httpRequest': 'HTTP Request',
  'n8n-nodes-base.code': 'Code',
  'n8n-nodes-base.set': 'Set',
  'n8n-nodes-base.if': 'If',
  'n8n-nodes-base.switch': 'Switch',
  'n8n-nodes-base.merge': 'Merge',
  'n8n-nodes-base.filter': 'Filter',
  'n8n-nodes-base.splitInBatches': 'Split In Batches',
  'n8n-nodes-base.itemLists': 'Item Lists',
  'n8n-nodes-base.respondToWebhook': 'Respond to Webhook',
  'n8n-nodes-base.gmail': 'Gmail',
  'n8n-nodes-base.emailSend': 'Send Email',
  'n8n-nodes-base.slack': 'Slack',
  'n8n-nodes-base.slackTrigger': 'Slack Trigger',
  'n8n-nodes-base.googleSheets': 'Google Sheets',
  'n8n-nodes-base.airtable': 'Airtable',
  'n8n-nodes-base.postgres': 'Postgres',
  'n8n-nodes-base.mysql': 'MySQL',
  'n8n-nodes-base.mongoDb': 'MongoDB',
  'n8n-nodes-base.redis': 'Redis',
  'n8n-nodes-base.scheduleTrigger': 'Schedule Trigger',
  'n8n-nodes-base.cron': 'Cron',
  'n8n-nodes-base.googleDrive': 'Google Drive',
  'n8n-nodes-base.spreadsheetFile': 'Spreadsheet File',
  'n8n-nodes-base.readBinaryFiles': 'Read Binary Files',
  'n8n-nodes-base.writeBinaryFile': 'Write Binary File',
  'n8n-nodes-base.graphql': 'GraphQL',
  'n8n-nodes-base.microsoftOutlook': 'Microsoft Outlook',
  'n8n-nodes-base.emailReadImap': 'Email (IMAP)',
  'n8n-nodes-base.noOp': 'No Op',
  '@n8n/n8n-nodes-langchain.agent': 'AI Agent',
  '@n8n/n8n-nodes-langchain.openAi': 'OpenAI',
  '@n8n/n8n-nodes-langchain.chainLlm': 'LLM Chain',
  '@n8n/n8n-nodes-langchain.lmChatOpenAi': 'OpenAI Chat Model',
  '@n8n/n8n-nodes-langchain.lmChatAnthropic': 'Anthropic Chat Model',
  '@n8n/n8n-nodes-langchain.chainSummarization': 'Summarization Chain',
  '@n8n/n8n-nodes-langchain.toolWorkflow': 'Workflow Tool',
  '@n8n/n8n-nodes-langchain.memoryBufferWindow': 'Window Buffer Memory',
  '@n8n/n8n-nodes-langchain.outputParserStructured': 'Structured Output Parser',
  'n8n-nodes-base.manualTrigger': 'Manual Trigger',
};

/**
 * Check if a node type matches a category mapping entry.
 * Category mappings use short forms like 'nodes-base.webhook'
 * while actual types may be 'n8n-nodes-base.webhook' or '@n8n/n8n-nodes-langchain.agent'.
 */
function matchesCategory(nodeType: string, categoryPattern: string): boolean {
  return nodeType.endsWith(categoryPattern) || nodeType.includes(categoryPattern);
}

/**
 * Get display name for a node type.
 */
function getDisplayName(nodeType: string): string {
  if (DISPLAY_NAMES[nodeType]) {
    return DISPLAY_NAMES[nodeType];
  }
  // Extract the last part after the last dot
  const parts = nodeType.split('.');
  const name = parts[parts.length - 1];
  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Determine if a node type is a trigger node.
 */
function isTriggerType(nodeType: string): boolean {
  const lower = nodeType.toLowerCase();
  return lower.includes('trigger') || lower.includes('webhook');
}

/**
 * Classify a set of node types into categories.
 */
function classifyTemplate(nodeTypes: string[], metadataCategories?: string[]): string[] {
  const categories = new Set<string>();

  for (const nodeType of nodeTypes) {
    for (const [category, patterns] of Object.entries(TASK_NODE_MAPPING)) {
      for (const pattern of patterns) {
        if (matchesCategory(nodeType, pattern)) {
          categories.add(category);
        }
      }
    }
  }

  // Also include categories from metadata_json if available
  if (metadataCategories && Array.isArray(metadataCategories)) {
    for (const cat of metadataCategories) {
      const normalized = cat.toLowerCase().replace(/[\s-]+/g, '_');
      // Map metadata categories to our category keys
      for (const key of Object.keys(TASK_NODE_MAPPING)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          categories.add(key);
        }
      }
    }
  }

  return Array.from(categories);
}

interface NodeFrequency {
  type: string;
  count: number;
  frequency: number;
  displayName: string;
}

interface EdgeFrequency {
  from: string;
  to: string;
  count: number;
}

interface ChainFrequency {
  chain: string[];
  count: number;
  frequency: number;
}

interface CategoryData {
  templateCount: number;
  pattern: string;
  nodes: Array<{ type: string; frequency: number; role: string; displayName: string }>;
  commonChains: ChainFrequency[];
}

interface PatternOutput {
  generatedAt: string;
  templateCount: number;
  categories: Record<string, CategoryData>;
  global: {
    topNodes: NodeFrequency[];
    topEdges: EdgeFrequency[];
  };
}

async function main(): Promise<void> {
  const dbPath = path.resolve(__dirname, '../../data/nodes.db');
  console.log(`Opening database: ${dbPath}`);
  const db = await createDatabaseAdapter(dbPath);

  // ---- Pass 1: Frequency & co-occurrence ----
  console.log('\n=== Pass 1: Node frequency & co-occurrence ===');
  const pass1Start = Date.now();

  const lightRows = db.prepare(
    'SELECT id, nodes_used, metadata_json, views FROM templates ORDER BY views DESC'
  ).all() as Array<{ id: number; nodes_used: string | null; metadata_json: string | null; views: number }>;

  const templateCount = lightRows.length;
  console.log(`Found ${templateCount} templates`);

  // Global counters
  const nodeFrequency = new Map<string, number>();
  const pairCooccurrence = new Map<string, number>();
  // Per-category tracking
  const categoryTemplates = new Map<string, Set<number>>();
  const categoryNodes = new Map<string, Map<string, number>>();

  for (let i = 0; i < lightRows.length; i++) {
    const row = lightRows[i];
    if (i > 0 && i % 500 === 0) {
      console.log(`  Processing template ${i}/${templateCount}...`);
    }

    if (!row.nodes_used) continue;

    let nodeTypes: string[];
    try {
      nodeTypes = JSON.parse(row.nodes_used);
      if (!Array.isArray(nodeTypes)) continue;
    } catch {
      continue;
    }

    // Deduplicate and filter
    const uniqueTypes = [...new Set(nodeTypes)].filter(t => !EXCLUDED_TYPES.has(t));
    if (uniqueTypes.length === 0) continue;

    // Count global frequency
    for (const nodeType of uniqueTypes) {
      nodeFrequency.set(nodeType, (nodeFrequency.get(nodeType) || 0) + 1);
    }

    // Count pairwise co-occurrence
    for (let a = 0; a < uniqueTypes.length; a++) {
      for (let b = a + 1; b < uniqueTypes.length; b++) {
        const pair = [uniqueTypes[a], uniqueTypes[b]].sort().join('|||');
        pairCooccurrence.set(pair, (pairCooccurrence.get(pair) || 0) + 1);
      }
    }

    // Classify into categories
    let metadataCategories: string[] | undefined;
    if (row.metadata_json) {
      try {
        const meta = JSON.parse(row.metadata_json);
        metadataCategories = meta.categories;
      } catch {
        // skip
      }
    }

    const categories = classifyTemplate(uniqueTypes, metadataCategories);
    for (const cat of categories) {
      if (!categoryTemplates.has(cat)) {
        categoryTemplates.set(cat, new Set());
        categoryNodes.set(cat, new Map());
      }
      categoryTemplates.get(cat)!.add(row.id);
      const catNodeMap = categoryNodes.get(cat)!;
      for (const nodeType of uniqueTypes) {
        catNodeMap.set(nodeType, (catNodeMap.get(nodeType) || 0) + 1);
      }
    }
  }

  const pass1Time = ((Date.now() - pass1Start) / 1000).toFixed(1);
  console.log(`Pass 1 complete: ${pass1Time}s`);
  console.log(`  Unique node types: ${nodeFrequency.size}`);
  console.log(`  Categories found: ${categoryTemplates.size}`);

  // ---- Pass 2: Connection topology ----
  console.log('\n=== Pass 2: Connection topology ===');
  const pass2Start = Date.now();

  const compressedRows = db.prepare(
    'SELECT id, nodes_used, workflow_json_compressed, views FROM templates ORDER BY views DESC'
  ).all() as Array<{ id: number; nodes_used: string | null; workflow_json_compressed: string | null; views: number }>;

  // Edge frequency: sourceType -> targetType
  const edgeFrequency = new Map<string, number>();
  // Chain frequency (by category)
  const categoryChains = new Map<string, Map<string, number>>();
  // Global chains
  const globalChains = new Map<string, number>();

  let decompressedCount = 0;
  let decompressFailCount = 0;

  for (let i = 0; i < compressedRows.length; i++) {
    const row = compressedRows[i];
    if (i > 0 && i % 500 === 0) {
      console.log(`  Processing template ${i}/${templateCount}...`);
    }

    if (!row.workflow_json_compressed) continue;

    let workflow: any;
    try {
      const decompressed = zlib.gunzipSync(Buffer.from(row.workflow_json_compressed, 'base64'));
      workflow = JSON.parse(decompressed.toString());
      decompressedCount++;
    } catch {
      decompressFailCount++;
      continue;
    }

    const nodes: any[] = workflow.nodes || [];
    const connections: Record<string, any> = workflow.connections || {};

    // Build name -> type map
    const nameToType = new Map<string, string>();
    for (const node of nodes) {
      if (node.name && node.type && !EXCLUDED_TYPES.has(node.type)) {
        nameToType.set(node.name, node.type);
      }
    }

    // Build adjacency list for BFS
    const adjacency = new Map<string, string[]>();

    // Parse connections and record edges
    for (const sourceName of Object.keys(connections)) {
      const sourceType = nameToType.get(sourceName);
      if (!sourceType) continue;

      const mainOutputs = connections[sourceName]?.main;
      if (!Array.isArray(mainOutputs)) continue;

      for (const outputGroup of mainOutputs) {
        if (!Array.isArray(outputGroup)) continue;
        for (const conn of outputGroup) {
          if (!conn || !conn.node) continue;
          const targetName = conn.node;
          const targetType = nameToType.get(targetName);
          if (!targetType) continue;

          // Record edge
          const edgeKey = `${sourceType}|||${targetType}`;
          edgeFrequency.set(edgeKey, (edgeFrequency.get(edgeKey) || 0) + 1);

          // Build adjacency for chain extraction
          if (!adjacency.has(sourceName)) {
            adjacency.set(sourceName, []);
          }
          adjacency.get(sourceName)!.push(targetName);
        }
      }
    }

    // Find trigger nodes (nodes with no incoming connections, or type contains 'Trigger')
    const hasIncoming = new Set<string>();
    for (const targets of adjacency.values()) {
      for (const target of targets) {
        hasIncoming.add(target);
      }
    }

    const triggerNodes = nodes.filter(n => {
      if (EXCLUDED_TYPES.has(n.type)) return false;
      return !hasIncoming.has(n.name) || isTriggerType(n.type);
    });

    // Pre-compute categories for this template (avoids re-parsing nodes_used per chain)
    let templateCategories: string[] = [];
    try {
      if (row.nodes_used) {
        const parsed = JSON.parse(row.nodes_used);
        if (Array.isArray(parsed)) {
          templateCategories = classifyTemplate(parsed.filter((t: string) => !EXCLUDED_TYPES.has(t)));
        }
      }
    } catch {
      // skip
    }

    // BFS from each trigger, extract chains of length 2-4
    for (const trigger of triggerNodes) {
      const queue: Array<{ nodeName: string; path: string[] }> = [
        { nodeName: trigger.name, path: [nameToType.get(trigger.name)!] },
      ];
      const visited = new Set<string>([trigger.name]);

      while (queue.length > 0) {
        const { nodeName, path: currentPath } = queue.shift()!;

        // Record chains of length 2, 3, 4
        if (currentPath.length >= 2 && currentPath.length <= 4) {
          const chainKey = currentPath.join('|||');
          globalChains.set(chainKey, (globalChains.get(chainKey) || 0) + 1);

          for (const cat of templateCategories) {
            if (!categoryChains.has(cat)) {
              categoryChains.set(cat, new Map());
            }
            const catChainMap = categoryChains.get(cat)!;
            catChainMap.set(chainKey, (catChainMap.get(chainKey) || 0) + 1);
          }
        }

        // Stop extending at depth 4
        if (currentPath.length >= 4) continue;

        const neighbors = adjacency.get(nodeName) || [];
        for (const neighbor of neighbors) {
          if (visited.has(neighbor)) continue;
          const neighborType = nameToType.get(neighbor);
          if (!neighborType) continue;
          visited.add(neighbor);
          queue.push({ nodeName: neighbor, path: [...currentPath, neighborType] });
        }
      }
    }
  }

  const pass2Time = ((Date.now() - pass2Start) / 1000).toFixed(1);
  console.log(`Pass 2 complete: ${pass2Time}s`);
  console.log(`  Decompressed: ${decompressedCount}, Failed: ${decompressFailCount}`);
  console.log(`  Unique edges: ${edgeFrequency.size}`);
  console.log(`  Unique chains: ${globalChains.size}`);

  // ---- Build output ----
  console.log('\n=== Building output ===');

  // Global top nodes
  const topNodes: NodeFrequency[] = [...nodeFrequency.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([type, count]) => ({
      type,
      count,
      frequency: Math.round((count / templateCount) * 100) / 100,
      displayName: getDisplayName(type),
    }));

  // Global top edges
  const topEdges: EdgeFrequency[] = [...edgeFrequency.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    });

  // Build category data
  const categories: Record<string, CategoryData> = {};

  for (const [cat, templateIds] of categoryTemplates.entries()) {
    const catNodeMap = categoryNodes.get(cat)!;
    const catTemplateCount = templateIds.size;

    // Top nodes for category, sorted by frequency
    const catTopNodes = [...catNodeMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([type, count]) => ({
        type,
        frequency: Math.round((count / catTemplateCount) * 100) / 100,
        role: isTriggerType(type) ? 'trigger' : 'action',
        displayName: getDisplayName(type),
      }));

    // Top chains for category
    const catChainMap = categoryChains.get(cat) || new Map<string, number>();
    const catTopChains: ChainFrequency[] = [...catChainMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([chainKey, count]) => ({
        chain: chainKey.split('|||'),
        count,
        frequency: Math.round((count / catTemplateCount) * 100) / 100,
      }));

    // Generate pattern string from top nodes
    // Order: triggers first, then transforms/logic, then actions
    const triggerNodes = catTopNodes.filter(n => n.role === 'trigger').slice(0, 1);
    const actionNodes = catTopNodes.filter(n => n.role !== 'trigger').slice(0, 3);
    const patternParts = [...triggerNodes, ...actionNodes].map(n => n.displayName);
    const pattern = patternParts.join(' \u2192 ') || 'Mixed workflow';

    categories[cat] = {
      templateCount: catTemplateCount,
      pattern,
      nodes: catTopNodes,
      commonChains: catTopChains,
    };
  }

  const output: PatternOutput = {
    generatedAt: new Date().toISOString(),
    templateCount,
    categories,
    global: {
      topNodes,
      topEdges,
    },
  };

  // Write output
  const outputPath = path.resolve(__dirname, '../../data/workflow-patterns.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nWritten ${Object.keys(categories).length} categories, ${templateCount} templates analyzed`);
  console.log(`Output: ${outputPath}`);
  console.log(`Pass 1: ${pass1Time}s, Pass 2: ${pass2Time}s`);
  console.log(`Total: ${((Date.now() - pass1Start) / 1000).toFixed(1)}s`);

  db.close();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
