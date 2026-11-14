/**
 * KiCad project information
 */
export interface KiCadProject {
  path: string;
  name: string;
  schematicPath?: string;
  pcbPath?: string;
}

/**
 * PCB board information
 */
export interface KiCadBoard {
  path: string;
  layers: number;
  components: KiCadComponent[];
  nets: KiCadNet[];
}

/**
 * Component/footprint information
 */
export interface KiCadComponent {
  reference: string;
  value: string;
  footprint: string;
  position: { x: number; y: number };
  rotation: number;
  layer: 'front' | 'back';
}

/**
 * Net/trace information
 */
export interface KiCadNet {
  id: number;
  name: string;
  componentPins: string[];
}

/**
 * Design rule check result
 */
export interface DRCResult {
  errors: DRCError[];
  warnings: DRCWarning[];
  passed: boolean;
}

export interface DRCError {
  type: string;
  message: string;
  location?: { x: number; y: number };
}

export interface DRCWarning {
  type: string;
  message: string;
  location?: { x: number; y: number };
}

/**
 * Export options for various formats
 */
export interface ExportOptions {
  outputDir: string;
  format: 'gerber' | 'drill' | 'pdf' | 'svg' | 'step' | 'vrml';
  layers?: string[];
}

/**
 * Client connection options
 */
export interface ClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}
