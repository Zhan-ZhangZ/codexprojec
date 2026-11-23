import type { TranscriptDocument } from "@/lib/transcript-editor";

export const LOCAL_ASR_MODELS = [
  {
    id: "onnx-community/whisper-tiny_timestamped",
    label: "Tiny",
    description: "速度优先，适合先跑通和较短素材",
  },
  {
    id: "onnx-community/whisper-base_timestamped",
    label: "Base",
    description: "更大容量，下载与转写耗时更长",
  },
  {
    id: "onnx-community/whisper-small_timestamped",
    label: "Small",
    description: "更大容量的本地候选，需要更多内存；按样本评测后选用",
  },
] as const;

export type LocalAsrModel = (typeof LOCAL_ASR_MODELS)[number]["id"];
export type LocalAsrDevice = "webgpu" | "wasm";

export function isLocalAsrModel(value: unknown): value is LocalAsrModel {
  return LOCAL_ASR_MODELS.some((model) => model.id === value);
}
export interface AsrWorkerRequest {
  type: "transcribe";
  audio: Float32Array;
  model: LocalAsrModel;
  language: string;
  preferWebGpu: boolean;
  offsetSeconds?: number;
  sourceDuration?: number;
  chunkIndex?: number;
}

export type AsrWorkerMessage =
  | { type: "device"; device: LocalAsrDevice; fallback?: boolean }
  | { type: "progress"; phase: "loading" | "transcribing"; progress: number; detail?: string }
  | { type: "complete"; transcript: TranscriptDocument }
  | { type: "error"; error: string };
