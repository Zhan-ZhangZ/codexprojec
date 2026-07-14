declare module "cadjs/common/cadScene.js" {
  import type { Group, Vector3 } from "three";

  type CadBounds = {
    min: number[];
    max: number[];
  };

  export const CAD_SCENE_SCALE: {
    CAD: string;
    URDF: string;
  };

  export type CadSceneApi = {
    root: Group;
    modelGroup: Group;
    edgesGroup: Group;
    displayRecords: unknown[];
    records: unknown[];
    bounds: CadBounds;
    radius: number;
    runtime: unknown;
    dispose: () => void;
    update: (settings?: Record<string, unknown>) => CadSceneApi;
  };

  export function buildModel(
    THREE: unknown,
    source: unknown,
    settings?: Record<string, unknown>
  ): CadSceneApi;

  export function fitCameraToModel(
    THREE: unknown,
    camera: unknown,
    bounds: CadBounds,
    options?: Record<string, unknown>
  ): {
    center: Vector3;
    radius: number;
    halfHeight: number;
    distance: number;
  };
}

declare module "cadjs/common/renderModel.js" {
  export type RenderViewportApi = {
    renderer: unknown;
    scene: unknown;
    camera: unknown;
    ready: Promise<void>;
    resize: () => unknown;
    render: () => void;
    start: () => void;
    stop: () => void;
    capturePng: () => string;
    dispose: () => void;
  };

  export function renderModel(
    THREE: unknown,
    model: unknown,
    options?: Record<string, unknown>
  ): RenderViewportApi;
}

declare module "cadjs/common/source.js" {
  export type RenderSource = {
    kind: string;
    meshData: unknown;
    stepParameterSource: {
      definition: import("cadjs/common/stepModule.js").StepModuleDefinition;
    } | null;
  };

  export function loadSource(
    input: unknown,
    options?: Record<string, unknown>
  ): Promise<RenderSource>;
}

declare module "cadjs/common/themeSettings.js" {
  export function cloneThemeSettings(themeId: string): Record<
    string,
    unknown
  > & {
    materials?: Record<string, unknown>;
  };
}

declare module "cadjs/common/stepModule.js" {
  export type StepModuleParameter = {
    id: string;
    type: string;
    defaultValue: unknown;
  };

  export type StepModuleAnimation = {
    id: string;
    duration: number;
    loop: boolean;
    update?: (context: {
      cycle: number;
      duration: number;
      elapsed: number;
      elapsedSec: number;
      loop: boolean;
      params: Record<string, unknown>;
      progress: number;
      set: (parameterId: string, value: unknown) => void;
    }) => void;
  };

  export type StepModuleDefinition = {
    animations: StepModuleAnimation[];
    parameterMap: Record<string, StepModuleParameter>;
  };

  export function loadStepModuleDefinition(
    url: string,
    options?: Record<string, unknown>
  ): Promise<StepModuleDefinition>;

  export function normalizeParameterValue(
    definition: StepModuleParameter,
    value: unknown
  ): unknown;

  export function normalizeStepModuleParameterValues(
    definition: StepModuleDefinition,
    values?: Record<string, unknown>
  ): Record<string, unknown>;
}
