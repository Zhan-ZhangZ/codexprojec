import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, rename, rm } from "fs/promises";
import { dirname } from "path";
import { ffmpegBin } from "@/lib/ffmpeg-path";
import { buildVideoFramingFilter, type VideoFraming } from "@/lib/video-framing";
import { buildBitrateReport, fpsCapArgs, probeEncodeStats, vbvArgs } from "@/lib/export-guard";
import type { PlatformSpec } from "@/lib/platform-specs";
import { withComposeSlot } from "@/lib/video-composer/composer";
import { runTranscriptFfmpeg } from "@/lib/transcript-render-process";

export function buildPlatformExportArgs(input: {
  sourcePath: string; outputPath: string; target: PlatformSpec; framing: VideoFraming; sourceFps: number;
}): string[] {
  const fps = fpsCapArgs(input.sourceFps, input.target.maxFps);
  return ["-nostdin", "-v", "error", "-y", "-i", input.sourcePath,
    "-filter_complex", buildVideoFramingFilter(input.target.w, input.target.h, input.framing),
    "-map", "[vout]", "-map", "0:a:0?", "-map_metadata", "0",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    ...vbvArgs(input.target.maxVideoKbps).split(" "), ...(fps ? fps.split(" ") : []),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k", input.outputPath];
}

export async function previewPlatformExport(input: {
  sourcePath: string; target: PlatformSpec; framing: VideoFraming; time: number; signal?: AbortSignal;
}): Promise<string> {
  // 使用实际输出尺寸的同一滤镜，最后缩成小图；只返回内存中的单帧，不写临时文件。
  const filter = buildVideoFramingFilter(input.target.w, input.target.h, input.framing)
    + ";[vout]scale=360:-2[preview]";
  const result = await withComposeSlot(() => promisify(execFile)(ffmpegBin(), [
    "-nostdin", "-v", "error", "-ss", input.time.toFixed(3), "-i", input.sourcePath,
    "-filter_complex", filter, "-map", "[preview]", "-frames:v", "1", "-an",
    "-f", "image2pipe", "-c:v", "mjpeg", "-q:v", "3", "pipe:1",
  ], { encoding: "buffer", maxBuffer: 4 * 1024 * 1024, timeout: 30_000, signal: input.signal }), input.signal);
  if (!result.stdout.length) throw new Error("EMPTY_EXPORT_PREVIEW");
  return `data:image/jpeg;base64,${result.stdout.toString("base64")}`;
}

export async function renderPlatformExport(input: {
  sourcePath: string; outputPath: string; target: PlatformSpec; framing: VideoFraming; signal?: AbortSignal;
}) {
  const temporaryPath = `${input.outputPath}.${crypto.randomUUID()}.partial.mp4`;
  await mkdir(dirname(input.outputPath), { recursive: true });
  try {
    return await withComposeSlot(async () => {
      input.signal?.throwIfAborted();
      const source = await probeEncodeStats(input.sourcePath, { signal: input.signal });
      const args = buildPlatformExportArgs({ ...input, outputPath: temporaryPath, sourceFps: source.fps });
      await runTranscriptFfmpeg(args, {
        duration: source.durationSec, timeoutMs: 15 * 60 * 1000, signal: input.signal,
        timeoutMessage: "平台导出超时，请缩短视频后重试",
      });
      const output = await probeEncodeStats(temporaryPath, { signal: input.signal });
      if (output.width !== input.target.w || output.height !== input.target.h || output.durationSec <= 0
        || Math.abs(output.durationSec - source.durationSec) > Math.max(0.5, source.durationSec * 0.01)) {
        throw new Error("INVALID_PLATFORM_EXPORT");
      }
      input.signal?.throwIfAborted();
      await rename(temporaryPath, input.outputPath);
      return buildBitrateReport(output, input.target);
    }, input.signal);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
