import type {
  KiCadProject,
  KiCadBoard,
  KiCadComponent,
  DRCResult,
  ExportOptions,
  ClientOptions,
} from '../types/index.js';

/**
 * Interface for KiCad client operations
 *
 * This interface abstracts KiCad operations and can be implemented by:
 * - MockKiCadClient (for testing and development)
 * - IPCKiCadClient (for real KiCad IPC API communication in the future)
 */
export interface IKiCadClient {
  /**
   * Connect to KiCad instance
   */
  connect(options?: ClientOptions): Promise<void>;

  /**
   * Disconnect from KiCad instance
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected to KiCad
   */
  isConnected(): boolean;

  /**
   * Create a new KiCad project
   */
  createProject(name: string, path: string): Promise<KiCadProject>;

  /**
   * Open an existing KiCad project
   */
  openProject(path: string): Promise<KiCadProject>;

  /**
   * Close the current project
   */
  closeProject(): Promise<void>;

  /**
   * Get current project information
   */
  getCurrentProject(): Promise<KiCadProject | null>;

  /**
   * Load PCB board
   */
  loadBoard(path: string): Promise<KiCadBoard>;

  /**
   * Save PCB board
   */
  saveBoard(path: string): Promise<void>;

  /**
   * Get all components on the board
   */
  getComponents(): Promise<KiCadComponent[]>;

  /**
   * Add a component to the board
   */
  addComponent(component: Omit<KiCadComponent, 'reference'>): Promise<KiCadComponent>;

  /**
   * Remove a component from the board
   */
  removeComponent(reference: string): Promise<void>;

  /**
   * Run Design Rule Check
   */
  runDRC(): Promise<DRCResult>;

  /**
   * Run Electrical Rule Check (for schematics)
   */
  runERC(): Promise<DRCResult>;

  /**
   * Auto-route traces
   */
  autoRoute(): Promise<void>;

  /**
   * Export board to various formats
   */
  export(options: ExportOptions): Promise<string[]>;

  /**
   * Generate 3D model
   */
  generate3D(outputPath: string, format: 'step' | 'vrml'): Promise<string>;

  /**
   * Generate Bill of Materials (BOM)
   */
  generateBOM(outputPath: string): Promise<string>;

  /**
   * Set the number of layers for the PCB
   */
  setLayerCount(layers: number): Promise<void>;

  /**
   * Set the board size (dimensions in mm)
   */
  setBoardSize(width: number, height: number): Promise<void>;
}
