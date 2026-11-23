import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, errText } from "@/lib/api-error";
import { getDb } from "@/lib/db";
import { mediaSources, projects } from "@/lib/db/schema";
import { probeMedia } from "@/lib/media-probe";
import { keepRangesForPlan, remapKeptWords, sanitizeTranscriptDocument, sanitizeTranscriptEditPlan, sourceTimeToOutputTime } from "@/lib/transcript-editor";
import { exportTimeline, type TimelineCaptionCue, type TimelineExportFormat } from "@/lib/timeline-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_ID = /^[a-zA-Z0-9-]+$/;
const FORMATS = new Set<TimelineExportFormat>(["otio", "edl", "csv"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const { id, mediaId } = await params;
  if (!SAFE_ID.test(id) || !SAFE_ID.test(mediaId)) return apiError(req, "无效的素材ID", "Invalid media ID", 400);
  try {
    const parsed = await req.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return apiError(req, "请求体必须是 JSON 对象", "Request body must be a JSON object", 400);
    }
    const body = parsed as Record<string, unknown>;
    const format = typeof body.format === "string" && FORMATS.has(body.format as TimelineExportFormat) ? body.format as TimelineExportFormat : "otio";
    const db = getDb();
    const [[project], [source]] = await Promise.all([
      db.select({ name: projects.name }).from(projects).where(eq(projects.id, id)).limit(1),
      db.select().from(mediaSources).where(and(eq(mediaSources.id, mediaId), eq(mediaSources.projectId, id))).limit(1),
    ]);
    if (!project || !source) return apiError(req, "项目或素材不存在", "Project or media source not found", 404);
    const transcript = sanitizeTranscriptDocument(source.transcript, source.duration / 1000);
    if (!transcript) return apiError(req, "请先完成素材转写", "Transcribe the media before exporting a timeline", 409);
    const plan = sanitizeTranscriptEditPlan(body.plan, new Set(transcript.words.map((word) => word.id)), transcript.duration);
    const keepRanges = keepRangesForPlan(transcript, plan);
    if (!keepRanges.length) return apiError(req, "当前草稿没有可导出的保留片段", "The current draft has no kept clips to export", 422);
    const metadata = await probeMedia(source.filePath);
    const clipNotes = keepRanges.map((range) => {
      const words = remapKeptWords(transcript, [range], plan);
      const cjk = words.some((word) => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(word.text));
      return (cjk ? words.map((word) => word.text).join("") : words.map((word) => word.text).join(" ")).slice(0, 2_000);
    });
    // Preserve sentence starts as record-time rhythm markers so an OTIO/EDL handoff
    // can be aligned to dialogue and music without another transcription/model pass.
    const beatMarkers: Array<{ time: number; sourceTime: number; label: string }> = [];
    const captionCues: TimelineCaptionCue[] = [];
    let recordCursor = 0;
    for (const range of keepRanges) {
      for (const segment of transcript.segments) {
        if (segment.start < range.start - 0.015 || segment.start > range.end + 0.015) continue;
        beatMarkers.push({
          time: recordCursor + Math.max(0, Math.min(segment.start, range.end) - range.start),
          sourceTime: segment.start,
          label: segment.text.slice(0, 160),
        });
      }
      recordCursor += range.end - range.start;
    }
    for (const segment of transcript.segments) {
      const time = sourceTimeToOutputTime(segment.start, keepRanges);
      const endTime = sourceTimeToOutputTime(segment.end, keepRanges);
      if (time === null || endTime === null || endTime - time < 0.01) continue;
      captionCues.push({ time, endTime, text: segment.text.slice(0, 2_000) });
    }
    const result = exportTimeline(format, {
      projectName: project.name,
      sourceName: source.originalName,
      sourceDuration: transcript.duration,
      frameRate: metadata.frameRate,
      hasAudio: source.hasAudio,
      keepRanges,
      clipNotes,
      captionCues,
      beatMarkers,
      revision: Number.isInteger(body.revision) && Number(body.revision) > 0 ? Number(body.revision) : null,
    });
    if (body.inline === true) return NextResponse.json(result);
    return new Response(result.content, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-ClipForge-Clips": String(result.clips),
        "X-ClipForge-Frame-Rate": String(result.frameRate),
      },
    });
  } catch (error) {
    if (error instanceof RangeError && error.message === "INVALID_CAPTION_REPLACEMENTS") return apiError(req, "字幕校对内容无效，请检查后重试", "Invalid caption corrections", 422);
    if (error instanceof RangeError && error.message === "INVALID_TRANSCRIPT_SOURCE_RANGE") return apiError(req, "保留区间无效或超出原片时长", "Invalid source range or range exceeds source duration", 422);
    console.error("Timeline export failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : errText(req, "时间线导出失败", "Failed to export timeline") }, { status: 500 });
  }
}
