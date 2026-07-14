import { KiCadService } from './kicad-service.js';
import type { IKiCadClient } from '@spark-apps/kicad-client';

/**
 * Project template definition
 */
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  layers?: number;
  boardSize?: { width: number; height: number };
  defaultComponents?: string[];
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  author?: string;
  description?: string;
  tags?: string[];
  version?: string;
  createdAt?: string;
}

/**
 * Project creation parameters
 */
export interface ProjectCreationParams {
  name: string;
  path: string;
  template?: string;
  metadata?: ProjectMetadata;
  prompt?: string;
}

/**
 * LLM-parsed project requirements
 */
export interface ParsedProjectRequirements {
  name: string;
  layers?: number;
  boardSize?: { width: number; height: number };
  components?: string[];
  constraints?: Record<string, unknown>;
  metadata?: ProjectMetadata;
}

/**
 * Available project templates
 */
const PROJECT_TEMPLATES = new Map<string, ProjectTemplate>([
  [
    'basic',
    {
      id: 'basic',
      name: 'Basic PCB',
      description: 'Simple 2-layer PCB project',
      layers: 2,
      boardSize: { width: 100, height: 80 },
    },
  ],
  [
    'esp32-dev',
    {
      id: 'esp32-dev',
      name: 'ESP32 Development Board',
      description: '4-layer ESP32 dev board with USB-C',
      layers: 4,
      boardSize: { width: 60, height: 40 },
      defaultComponents: ['ESP32-WROOM-32', 'USB-C-Connector', 'LDO-3V3'],
    },
  ],
  [
    'arduino-shield',
    {
      id: 'arduino-shield',
      name: 'Arduino Shield',
      description: '2-layer Arduino-compatible shield',
      layers: 2,
      boardSize: { width: 68.58, height: 53.34 },
    },
  ],
  [
    'power-supply',
    {
      id: 'power-supply',
      name: 'Power Supply',
      description: '2-layer power supply board',
      layers: 2,
      boardSize: { width: 80, height: 60 },
      defaultComponents: ['LM2596', 'Inductor', 'Capacitor'],
    },
  ],
]);

/**
 * Service for creating KiCad projects
 */
export class ProjectCreationService {
  private client: IKiCadClient;

  constructor(client?: IKiCadClient) {
    this.client = client ?? KiCadService.getClient();
  }

  /**
   * Get all available templates
   */
  getTemplates(): ProjectTemplate[] {
    return Array.from(PROJECT_TEMPLATES.values());
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): ProjectTemplate | undefined {
    return PROJECT_TEMPLATES.get(id);
  }

  /**
   * Parse natural language prompt into project requirements
   * This is a placeholder - actual implementation would use LLM APIs
   */
  parsePrompt(prompt: string): ParsedProjectRequirements {
    // TODO: Integrate with OpenAI GPT-4 or Claude API
    // For now, return a mock parsed response

    // Simple keyword extraction for demo purposes
    const lowerPrompt = prompt.toLowerCase();

    let layers = 2;
    if (lowerPrompt.includes('4-layer') || lowerPrompt.includes('4 layer')) {
      layers = 4;
    } else if (lowerPrompt.includes('6-layer') || lowerPrompt.includes('6 layer')) {
      layers = 6;
    }

    // Extract project name from prompt or use default
    const nameMatch = /(?:called|named)\s+"([^"]+)"/i.exec(prompt);
    const name = nameMatch ? nameMatch[1] : 'new-project';

    const requirements: ParsedProjectRequirements = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      layers,
      metadata: {
        description: prompt,
        createdAt: new Date().toISOString(),
      },
    };

    // Detect ESP32 projects
    if (lowerPrompt.includes('esp32')) {
      requirements.components = ['ESP32-WROOM-32', 'USB-C-Connector', 'LDO-3V3'];
      requirements.boardSize = { width: 60, height: 40 };
    }

    // Detect Arduino projects
    if (lowerPrompt.includes('arduino')) {
      requirements.boardSize = { width: 68.58, height: 53.34 };
    }

    return requirements;
  }

  /**
   * Create a new KiCad project
   */
  async createProject(params: ProjectCreationParams): Promise<{
    success: boolean;
    projectPath: string;
    message: string;
  }> {
    try {
      // Ensure client is connected
      await KiCadService.ensureConnected();

      // Parse prompt if provided
      let requirements: ParsedProjectRequirements | undefined;
      if (params.prompt) {
        requirements = this.parsePrompt(params.prompt);
      }

      // Get template if specified
      let template: ProjectTemplate | undefined;
      if (params.template) {
        template = this.getTemplate(params.template);
        if (!template) {
          throw new Error(`Template '${params.template}' not found`);
        }
      }

      // Determine final project configuration
      const projectName = requirements?.name ?? params.name;
      const projectPath = `${params.path}/${projectName}`;

      const config = {
        name: projectName,
        path: projectPath,
        layers: requirements?.layers ?? template?.layers ?? 2,
        boardSize: requirements?.boardSize ?? template?.boardSize ?? { width: 100, height: 80 },
        components: requirements?.components ?? template?.defaultComponents ?? [],
        metadata: {
          ...params.metadata,
          ...requirements?.metadata,
        },
      };

      // Create project using KiCad client
      await this.client.createProject(config.name, config.path);

      // Apply template configuration
      await this.client.setLayerCount(config.layers);
      await this.client.setBoardSize(config.boardSize.width, config.boardSize.height);

      // Add metadata to project
      this.addProjectMetadata(projectPath, config.metadata);

      return {
        success: true,
        projectPath,
        message: `Project '${projectName}' created successfully at ${projectPath}`,
      };
    } catch (error) {
      return {
        success: false,
        projectPath: '',
        message: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Add metadata to project file
   * This would write metadata to the .kicad_pro file or a separate metadata file
   */
  private addProjectMetadata(projectPath: string, metadata: ProjectMetadata): void {
    // TODO: Implement actual metadata writing to KiCad project file
    // For now, this is a no-op placeholder
    // Metadata would be written to the .kicad_pro JSON file
    void projectPath;
    void metadata;
  }

  /**
   * Validate project creation parameters
   */
  validateParams(params: ProjectCreationParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.name || params.name.trim().length === 0) {
      errors.push('Project name is required');
    }

    if (!params.path || params.path.trim().length === 0) {
      errors.push('Project path is required');
    }

    if (params.template && !this.getTemplate(params.template)) {
      errors.push(`Template '${params.template}' does not exist`);
    }

    if (params.name && !/^[a-zA-Z0-9-_]+$/.test(params.name)) {
      errors.push('Project name can only contain letters, numbers, hyphens, and underscores');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
