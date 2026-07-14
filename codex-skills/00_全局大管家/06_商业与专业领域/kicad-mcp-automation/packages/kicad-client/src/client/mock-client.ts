import type { IKiCadClient } from './interface.js';
import type {
  KiCadProject,
  KiCadBoard,
  KiCadComponent,
  DRCResult,
  ExportOptions,
  ClientOptions,
} from '../types/index.js';
import {
  ConnectionError,
  ProjectError,
  OperationError,
} from '../errors/index.js';

/**
 * Mock implementation of KiCad client for testing and development
 */
export class MockKiCadClient implements IKiCadClient {
  private connected = false;
  private currentProject: KiCadProject | null = null;
  private currentBoard: KiCadBoard | null = null;
  private components: KiCadComponent[] = [];
  private simulateDelay = 100; // ms
  private shouldFailNext: string | null = null;

  async connect(_options?: ClientOptions): Promise<void> {
    await this.delay();
    if (this.shouldFailNext === 'connect') {
      this.shouldFailNext = null;
      throw new ConnectionError('Failed to connect to mock KiCad');
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.delay();
    this.connected = false;
    this.currentProject = null;
    this.currentBoard = null;
    this.components = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  async createProject(name: string, path: string): Promise<KiCadProject> {
    this.ensureConnected();
    await this.delay();

    if (this.shouldFailNext === 'createProject') {
      this.shouldFailNext = null;
      throw new ProjectError('Failed to create project');
    }

    const project: KiCadProject = {
      path,
      name,
      schematicPath: `${path}/${name}.kicad_sch`,
      pcbPath: `${path}/${name}.kicad_pcb`,
    };

    this.currentProject = project;

    // Automatically create a default board for the new project
    this.currentBoard = {
      path: project.pcbPath || `${path}/${name}.kicad_pcb`,
      layers: 2,
      components: [],
      nets: [],
    };

    return project;
  }

  async openProject(path: string): Promise<KiCadProject> {
    this.ensureConnected();
    await this.delay();

    if (this.shouldFailNext === 'openProject') {
      this.shouldFailNext = null;
      throw new ProjectError(`Project not found: ${path}`);
    }

    const name = path.split('/').pop() || 'project';
    const project: KiCadProject = {
      path,
      name,
      schematicPath: `${path}/${name}.kicad_sch`,
      pcbPath: `${path}/${name}.kicad_pcb`,
    };

    this.currentProject = project;
    return project;
  }

  async closeProject(): Promise<void> {
    this.ensureConnected();
    await this.delay();
    this.currentProject = null;
    this.currentBoard = null;
    this.components = [];
  }

  async getCurrentProject(): Promise<KiCadProject | null> {
    this.ensureConnected();
    await this.delay();
    return this.currentProject;
  }

  async loadBoard(path: string): Promise<KiCadBoard> {
    this.ensureConnected();
    await this.delay();

    if (this.shouldFailNext === 'loadBoard') {
      this.shouldFailNext = null;
      throw new ProjectError(`Board not found: ${path}`);
    }

    const board: KiCadBoard = {
      path,
      layers: 2,
      components: this.components,
      nets: [],
    };

    this.currentBoard = board;
    return board;
  }

  async saveBoard(path: string): Promise<void> {
    this.ensureConnected();
    await this.delay();

    if (!this.currentBoard) {
      throw new ProjectError('No board loaded');
    }

    if (this.shouldFailNext === 'saveBoard') {
      this.shouldFailNext = null;
      throw new OperationError('Failed to save board');
    }

    this.currentBoard.path = path;
  }

  async getComponents(): Promise<KiCadComponent[]> {
    this.ensureConnected();
    await this.delay();
    return [...this.components];
  }

  async addComponent(
    component: Omit<KiCadComponent, 'reference'>
  ): Promise<KiCadComponent> {
    this.ensureConnected();
    await this.delay();

    const reference = `U${this.components.length + 1}`;
    const newComponent: KiCadComponent = {
      ...component,
      reference,
    };

    this.components.push(newComponent);
    return newComponent;
  }

  async removeComponent(reference: string): Promise<void> {
    this.ensureConnected();
    await this.delay();

    const index = this.components.findIndex((c) => c.reference === reference);
    if (index === -1) {
      throw new OperationError(`Component not found: ${reference}`);
    }

    this.components.splice(index, 1);
  }

  async runDRC(): Promise<DRCResult> {
    this.ensureConnected();
    await this.delay();

    if (this.shouldFailNext === 'runDRC') {
      this.shouldFailNext = null;
      throw new OperationError('DRC check failed');
    }

    // Mock: generate some sample errors/warnings
    return {
      passed: this.components.length > 0,
      errors: [],
      warnings: this.components.length === 0
        ? [{ type: 'NO_COMPONENTS', message: 'No components on board' }]
        : [],
    };
  }

  async runERC(): Promise<DRCResult> {
    this.ensureConnected();
    await this.delay();

    return {
      passed: true,
      errors: [],
      warnings: [],
    };
  }

  async autoRoute(): Promise<void> {
    this.ensureConnected();
    await this.delay();

    if (this.components.length === 0) {
      throw new OperationError('No components to route');
    }
  }

  async export(options: ExportOptions): Promise<string[]> {
    this.ensureConnected();
    await this.delay();

    const files: string[] = [];
    const baseName = this.currentProject?.name || 'board';

    switch (options.format) {
      case 'gerber':
        files.push(`${options.outputDir}/${baseName}.gbr`);
        break;
      case 'drill':
        files.push(`${options.outputDir}/${baseName}.drl`);
        break;
      case 'pdf':
        files.push(`${options.outputDir}/${baseName}.pdf`);
        break;
      case 'svg':
        files.push(`${options.outputDir}/${baseName}.svg`);
        break;
      case 'step':
        files.push(`${options.outputDir}/${baseName}.step`);
        break;
      case 'vrml':
        files.push(`${options.outputDir}/${baseName}.wrl`);
        break;
    }

    return files;
  }

  async generate3D(outputPath: string, format: 'step' | 'vrml'): Promise<string> {
    this.ensureConnected();
    await this.delay();

    const ext = format === 'step' ? '.step' : '.wrl';
    return `${outputPath}${ext}`;
  }

  async generateBOM(outputPath: string): Promise<string> {
    this.ensureConnected();
    await this.delay();

    return `${outputPath}.csv`;
  }

  async setLayerCount(layers: number): Promise<void> {
    this.ensureConnected();
    await this.delay();

    if (layers < 1 || layers > 32) {
      throw new OperationError('Layer count must be between 1 and 32');
    }

    if (this.currentBoard) {
      this.currentBoard.layers = layers;
    }
    // If no board loaded, setting will be applied when board is created
  }

  async setBoardSize(width: number, height: number): Promise<void> {
    this.ensureConnected();
    await this.delay();

    if (width <= 0 || height <= 0) {
      throw new OperationError('Board dimensions must be positive');
    }

    // Board size is stored in the mock but not exposed in the KiCadBoard interface
    // In a real implementation, this would modify the board edge cuts
    // For now, this is a no-op in the mock but validates the parameters
  }

  // Test utilities
  setSimulateDelay(ms: number): void {
    this.simulateDelay = ms;
  }

  injectError(operation: string): void {
    this.shouldFailNext = operation;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new ConnectionError('Not connected to KiCad');
    }
  }

  private async delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.simulateDelay));
  }
}
