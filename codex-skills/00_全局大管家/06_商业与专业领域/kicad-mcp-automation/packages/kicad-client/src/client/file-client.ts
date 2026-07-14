import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IKiCadClient } from './interface.js';
import type {
  KiCadProject,
  KiCadBoard,
  KiCadComponent,
  DRCResult,
  ExportOptions,
} from '../types/index.js';
import { ConnectionError, OperationError } from '../errors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * File-based KiCad client implementation
 * Generates real KiCad files using Python kiutils library
 */
export class FileKiCadClient implements IKiCadClient {
  private connected: boolean = false;
  private currentProject: KiCadProject | null = null;
  private pythonBridgePath: string;

  constructor() {
    // Path to Python bridge script
    this.pythonBridgePath = join(__dirname, '../../python/kicad_bridge.py');
  }

  /**
   * Execute Python bridge command
   */
  private async executePythonBridge(command: string, args: string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [this.pythonBridgePath, command, ...args]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new OperationError(`Python bridge failed: ${stderr !== '' ? stderr : stdout}`));
          return;
        }

        try {
          const result = JSON.parse(stdout) as Record<string, unknown>;
          if (result.success === false) {
            const message = (result.message as string | undefined) ?? (result.error as string | undefined) ?? 'Unknown error';
            reject(new OperationError(message));
          } else {
            resolve(result);
          }
        } catch {
          reject(new OperationError(`Failed to parse Python bridge output: ${stdout}`));
        }
      });

      pythonProcess.on('error', (error: Error) => {
        reject(new ConnectionError(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  async connect(): Promise<void> {
    // Test Python and kiutils availability
    try {
      await this.executePythonBridge('get_components', ['/dev/null']); // Harmless test call
    } catch (error) {
      if (error instanceof Error && error.message.includes('kiutils not installed')) {
        throw new ConnectionError(
          'kiutils not installed. Run: pip install kiutils'
        );
      }
      // Other errors are OK for this test call
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.currentProject = null;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async createProject(name: string, path: string): Promise<KiCadProject> {
    this.ensureConnected();

    const result = await this.executePythonBridge('create_project', [
      name,
      path,
      '2', // layers (default)
      '100', // width (default)
      '80', // height (default)
    ]);

    const files = result.files as Record<string, unknown>;
    this.currentProject = {
      name,
      path: result.projectPath as string,
      schematicPath: files.schematic as string,
      pcbPath: files.pcb as string,
    };

    return this.currentProject;
  }

  async openProject(path: string): Promise<KiCadProject> {
    this.ensureConnected();

    // Extract project name from path
    const name = path.split('/').pop()?.replace('.kicad_pro', '') ?? 'project';
    const projectDir = path.replace(/\.kicad_pro$/, '');

    this.currentProject = {
      name,
      path: projectDir,
      schematicPath: `${projectDir}.kicad_sch`,
      pcbPath: `${projectDir}.kicad_pcb`,
    };

    return Promise.resolve(this.currentProject);
  }

  async getCurrentProject(): Promise<KiCadProject | null> {
    return Promise.resolve(this.currentProject);
  }

  async setLayerCount(layers: number): Promise<void> {
    this.ensureConnected();

    if (layers < 1 || layers > 32) {
      throw new OperationError('Layer count must be between 1 and 32');
    }

    // Layer count is set during project creation
    // For existing projects, this would require PCB file modification
    // TODO: Implement layer count modification for existing boards
    return Promise.resolve();
  }

  async setBoardSize(width: number, height: number): Promise<void> {
    this.ensureConnected();

    if (width <= 0 || height <= 0) {
      throw new OperationError('Board dimensions must be positive');
    }

    // Board size is set during project creation
    // For existing projects, this would require PCB file modification
    // TODO: Implement board size modification for existing boards
    return Promise.resolve();
  }

  async closeProject(): Promise<void> {
    this.currentProject = null;
    return Promise.resolve();
  }

  async loadBoard(boardPath: string): Promise<KiCadBoard> {
    this.ensureConnected();

    // Load board state from PCB file
    // TODO: Implement full board loading
    void boardPath;
    return Promise.reject(new OperationError('loadBoard not yet implemented'));
  }

  async saveBoard(path: string): Promise<void> {
    this.ensureConnected();

    // Board is saved automatically after each operation via Python bridge
    // This method is a no-op for file-based client
    void path;
    return Promise.resolve();
  }

  async addComponent(component: Omit<KiCadComponent, 'reference'>): Promise<KiCadComponent> {
    this.ensureConnected();

    if (!this.currentProject?.pcbPath) {
      throw new OperationError('No project open');
    }

    const pcbPath = this.currentProject.pcbPath;
    if (!pcbPath) {
      throw new OperationError('PCB path not available');
    }

    const rotation = component.rotation !== undefined ? component.rotation : 0;
    const layer = component.layer !== undefined ? component.layer : 'F.Cu';

    const result = await this.executePythonBridge('add_component', [
      pcbPath,
      component.value,
      component.footprint,
      component.position.x.toString(),
      component.position.y.toString(),
      rotation.toString(),
      layer,
    ]);

    return result.component as KiCadComponent;
  }

  async removeComponent(reference: string): Promise<void> {
    this.ensureConnected();

    // TODO: Implement component removal via Python bridge
    void reference;
    return Promise.reject(new OperationError('removeComponent not yet implemented'));
  }

  async getComponents(): Promise<KiCadComponent[]> {
    this.ensureConnected();

    if (!this.currentProject?.pcbPath) {
      throw new OperationError('No project open');
    }

    const result = await this.executePythonBridge('get_components', [
      this.currentProject.pcbPath,
    ]);

    return result.components as KiCadComponent[];
  }

  async runDRC(): Promise<DRCResult> {
    this.ensureConnected();

    // DRC requires KiCad CLI - return mock for now
    // TODO: Implement real DRC using KiCad CLI
    return Promise.resolve({
      passed: true,
      errors: [],
      warnings: [
        {
          type: 'info',
          message: 'DRC not yet implemented - requires KiCad CLI',
        },
      ],
    });
  }

  async runERC(): Promise<DRCResult> {
    this.ensureConnected();

    // ERC requires KiCad CLI - return mock for now
    // TODO: Implement real ERC using KiCad CLI
    return Promise.resolve({
      passed: true,
      errors: [],
      warnings: [
        {
          type: 'info',
          message: 'ERC not yet implemented - requires KiCad CLI',
        },
      ],
    });
  }

  async export(options: ExportOptions): Promise<string[]> {
    this.ensureConnected();

    // Export requires KiCad CLI
    // TODO: Implement real export using KiCad CLI
    void options;
    return Promise.reject(new OperationError('Export not yet implemented - requires KiCad CLI'));
  }

  async generateBOM(outputPath: string): Promise<string> {
    this.ensureConnected();

    // BOM generation requires KiCad CLI or custom implementation
    // TODO: Implement BOM generation
    void outputPath;
    return Promise.reject(new OperationError('BOM generation not yet implemented'));
  }

  async generate3D(outputPath: string, format: 'step' | 'vrml' = 'step'): Promise<string> {
    this.ensureConnected();

    if (!this.currentProject?.pcbPath) {
      throw new OperationError('No project open');
    }

    // Use KiCad CLI to generate 3D model
    return new Promise((resolve, reject) => {
      if (!this.currentProject?.pcbPath) {
        reject(new OperationError('No PCB path available'));
        return;
      }

      const pcbPath = this.currentProject.pcbPath;
      const args = [
        'pcb',
        'export',
        format === 'step' ? 'step' : 'vrml',
        pcbPath,
        '-o',
        outputPath,
      ];

      const kicadProcess = spawn('kicad-cli', args);

      let stderr = '';

      kicadProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      kicadProcess.on('close', (code) => {
        if (code !== 0) {
          const errorCode = code ?? 'unknown';
          reject(
            new OperationError(
              `KiCad CLI failed (code ${String(errorCode)}): ${stderr}\n` +
                `Make sure KiCad is installed and kicad-cli is in PATH`
            )
          );
        } else {
          resolve(outputPath);
        }
      });

      kicadProcess.on('error', (error: Error) => {
        reject(
          new OperationError(
            `Failed to execute kicad-cli: ${error.message}\n` +
              `Make sure KiCad is installed and kicad-cli is in PATH`
          )
        );
      });
    });
  }

  async autoRoute(): Promise<void> {
    this.ensureConnected();

    // Auto-routing requires external tools
    // TODO: Implement auto-routing integration
    return Promise.reject(new OperationError('Auto-routing not yet implemented'));
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new ConnectionError('Not connected to KiCad. Call connect() first.');
    }
  }
}
