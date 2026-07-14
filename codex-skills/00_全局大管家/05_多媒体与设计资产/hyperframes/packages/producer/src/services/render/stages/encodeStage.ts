/**
 * encodeStage — Stage 5 of `executeRenderJob`. Two paths share the stage:
 *
 *   1. png-sequence: no encoder. Captured PNGs are renamed to
 *      `frame_NNNNNN.png` and copied to `outputPath`. Audio (if any) is
 *      written as an `audio.aac` sidecar.
 *   2. mp4 / webm / mov: invokes `encodeFramesFromDir` (or the chunked-
 *      concat variant when `enableChunkedEncode` is on) to produce
 *      `videoOnlyPath`. The mux + faststart pass lives in `assembleStage`.
 *
 * Skipped entirely when the streaming-encode fusion path
 * (`captureStreamingStage`) already produced `videoOnlyPath` — the
 * sequencer gates the call on `!streamingHandled`.
 *
 * Hard constraints preserved verbatim:
 *   - The "Writing PNG sequence" / "Encoding video" `updateJobStatus`
 *     payload fires at 75% from inside the stage.
 *   - The png-sequence path throws "png-sequence output requested but no
 *     PNGs were captured to ..." if `framesDir` is empty.
 *   - The png-sequence audio sidecar is only written when
 *     `hasAudio && existsSync(audioOutputPath)`.
 *   - For encoded output, `enableChunkedEncode` selects
 *     `encodeFramesChunkedConcat` vs `encodeFramesFromDir` — same
 *     branch + same args.
 *   - `Encoding failed: <err>` throws on the encoder's
 *     `success: false`.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  encodeFramesChunkedConcat,
  encodeFramesFromDir,
  getEncoderPreset,
} from "@hyperframes/engine";
import type { ProducerLogger } from "../../../logger.js";
import type { ProgressCallback, RenderJob } from "../../renderOrchestrator.js";
import { updateJobStatus } from "../shared.js";

export interface EncodeStageInput {
  job: RenderJob;
  log: ProducerLogger;
  /** Output path: a directory for png-sequence, a file for everything else. */
  outputPath: string;
  /** Where captured frames live on disk. */
  framesDir: string;
  /** Encoded video output (ignored on the png-sequence path). */
  videoOnlyPath: string;
  /** Output dimensions (post-deviceScaleFactor). */
  width: number;
  height: number;
  /** True when the output format requires an alpha channel; selects frame extension. */
  needsAlpha: boolean;
  /** True iff the composition has audio. Drives the sidecar copy. */
  hasAudio: boolean;
  /**
   * Path to the mixed audio. Required when `hasAudio` is `true` (the
   * png-sequence sidecar copy reads it); ignored when `hasAudio` is
   * `false`. Distributed chunk workers mux audio once at assemble time
   * and pass `hasAudio: false` here, so the field is left optional.
   */
  audioOutputPath?: string;
  /** Mp4 vs png-sequence vs … gates the entire stage branch. */
  isPngSequence: boolean;
  /** Encoder preset (codec, preset, pixelFormat, hdr). Only used on the non-png path. */
  preset: ReturnType<typeof getEncoderPreset>;
  effectiveQuality: number;
  effectiveBitrate: string | undefined;
  /** Producer config — enables the chunked-concat encoder when on. */
  enableChunkedEncode: boolean;
  chunkedEncodeSize: number;
  abortSignal: AbortSignal | undefined;
  assertNotAborted: () => void;
  onProgress?: ProgressCallback;
  /**
   * Pass-through of `EncoderOptions.lockGopForChunkConcat`. When `true`,
   * the encode emits closed-GOP keyframes at every `gopSize` boundary so
   * downstream `ffmpeg -f concat -c copy` round-trips losslessly. Only the
   * distributed chunk worker (`renderChunk`) sets this — the in-process
   * renderer's call site omits it, preserving the existing open-GOP output.
   */
  lockGopForChunkConcat?: boolean;
  /** Required when `lockGopForChunkConcat === true`. Number of frames per GOP — set to the chunk's frame count by `renderChunk`. */
  gopSize?: number;
}

export interface EncodeStageResult {
  /** Wall-clock ms for the encode (or png-copy) phase. */
  encodeMs: number;
}

export async function runEncodeStage(input: EncodeStageInput): Promise<EncodeStageResult> {
  const {
    job,
    log,
    outputPath,
    framesDir,
    videoOnlyPath,
    width,
    height,
    needsAlpha,
    hasAudio,
    audioOutputPath,
    isPngSequence,
    preset,
    effectiveQuality,
    effectiveBitrate,
    enableChunkedEncode,
    chunkedEncodeSize,
    abortSignal,
    assertNotAborted,
    onProgress,
  } = input;

  const stage5Start = Date.now();

  if (isPngSequence) {
    // ── Stage 5 (png-sequence): copy captured PNGs to outputDir ──────
    // No encoder, no mux, no faststart — captured frames already carry
    // alpha and are the deliverable. We rename to `frame_NNNNNN.png`
    // (zero-padded) so consumers (After Effects, Nuke, Fusion, ffmpeg
    // image2 demuxer) can globbed-import without surprises.
    updateJobStatus(job, "encoding", "Writing PNG sequence", 75, onProgress);
    if (!existsSync(outputPath)) mkdirSync(outputPath, { recursive: true });
    const captured = readdirSync(framesDir)
      .filter((name) => name.endsWith(".png"))
      .sort();
    if (captured.length === 0) {
      throw new Error(
        `[Render] png-sequence output requested but no PNGs were captured to ${framesDir}`,
      );
    }
    captured.forEach((name, i) => {
      const dst = join(outputPath, `frame_${String(i + 1).padStart(6, "0")}.png`);
      copyFileSync(join(framesDir, name), dst);
    });
    if (hasAudio && audioOutputPath && existsSync(audioOutputPath)) {
      // Sidecar audio for callers that need to re-mux later. png-sequence
      // has no container of its own, so this is the only place audio
      // can land alongside the frames.
      copyFileSync(audioOutputPath, join(outputPath, "audio.aac"));
      log.info(`[Render] png-sequence: audio.aac sidecar written to ${outputPath}/audio.aac`);
    }
    return { encodeMs: Date.now() - stage5Start };
  }

  // ── Stage 5: Encode ───────────────────────────────────────────────
  updateJobStatus(job, "encoding", "Encoding video", 75, onProgress);

  const frameExt = needsAlpha ? "png" : "jpg";
  const framePattern = `frame_%06d.${frameExt}`;
  const encoderOpts = {
    fps: job.config.fps,
    width,
    height,
    codec: preset.codec,
    preset: preset.preset,
    quality: effectiveQuality,
    bitrate: effectiveBitrate,
    pixelFormat: preset.pixelFormat,
    useGpu: job.config.useGpu,
    hdr: preset.hdr,
    // Distributed chunk renders pass these so the encoder writes closed-GOP
    // keyframes that survive `-f concat -c copy` at assemble time. In-process
    // renders leave both undefined → preserves the existing open-GOP output.
    lockGopForChunkConcat: input.lockGopForChunkConcat === true,
    gopSize: input.gopSize,
  };
  const encodeResult = enableChunkedEncode
    ? await encodeFramesChunkedConcat(
        framesDir,
        framePattern,
        videoOnlyPath,
        encoderOpts,
        chunkedEncodeSize,
        abortSignal,
      )
    : await encodeFramesFromDir(framesDir, framePattern, videoOnlyPath, encoderOpts, abortSignal);
  assertNotAborted();

  if (!encodeResult.success) {
    throw new Error(`Encoding failed: ${encodeResult.error}`);
  }

  return { encodeMs: Date.now() - stage5Start };
}
