/** 网页、预览与实际导出共用的构图契约；坐标表示可裁切余量中的位置。 */
export interface VideoFraming {
  mode: "blur" | "fit" | "crop";
  positionX: number;
  positionY: number;
}

export const DEFAULT_VIDEO_FRAMING: VideoFraming = { mode: "blur", positionX: 0.5, positionY: 0.5 };

export function parseVideoFraming(value: unknown): VideoFraming {
  if (value === undefined) return { ...DEFAULT_VIDEO_FRAMING };
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RangeError("INVALID_VIDEO_FRAMING");
  const raw = value as Record<string, unknown>;
  const mode = raw.mode ?? "blur";
  if (mode !== "blur" && mode !== "fit" && mode !== "crop") throw new RangeError("INVALID_VIDEO_FRAMING");
  const coordinate = (value: unknown) => {
    if (value === undefined) return 0.5;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("INVALID_VIDEO_FRAMING");
    return Math.round(value * 10000) / 10000;
  };
  const positionX = coordinate(raw.positionX);
  const positionY = coordinate(raw.positionY);
  return { mode, positionX: mode === "crop" ? positionX : 0.5, positionY: mode === "crop" ? positionY : 0.5 };
}

/** 先按显示宽高比归一化非方形像素，保证预览、裁切和输出比例一致。 */
export function buildVideoFramingFilter(width: number, height: number, value: VideoFraming): string {
  if (![width, height].every((n) => Number.isInteger(n) && n >= 2 && n <= 8192 && n % 2 === 0)) throw new RangeError("INVALID_OUTPUT_SIZE");
  const framing = parseVideoFraming(value);
  const base = "[0:v:0]scale=trunc(iw*sar/2)*2:ih,setsar=1";
  const fit = `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`;
  const fill = `scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=2`;
  if (framing.mode === "crop") {
    return `${base},${fill},crop=${width}:${height}:x='(iw-ow)*${framing.positionX}':y='(ih-oh)*${framing.positionY}',setsar=1,format=yuv420p[vout]`;
  }
  if (framing.mode === "fit") {
    return `${base},${fit},pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[vout]`;
  }
  return `${base},split=2[background][foreground];` +
    `[background]${fill},crop=${width}:${height},boxblur=24:4[bg];` +
    `[foreground]${fit}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[vout]`;
}
