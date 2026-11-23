import { NextRequest, NextResponse } from "next/server";
import { getDataDir, fileNameOf } from "@/lib/paths";
import { join } from "path";
import { existsSync } from "fs";
import { getDb } from "@/lib/db";
import { compositions } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { PLATFORM_SPECS } from "@/lib/platform-specs";
import { probeEncodeStats } from "@/lib/export-guard";
import { parseVideoFraming } from "@/lib/video-framing";
import { previewPlatformExport, renderPlatformExport } from "@/lib/platform-export";
import { apiError, errText } from "@/lib/api-error";

export const runtime = "nodejs";

/** 固定成片版本，复用同一构图规则进行帧预览和完整导出。 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      return apiError(req, "无效的项目ID", "Invalid project ID");
    }
    let body: Record<string, unknown> = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      /* allow the error below to explain the missing platform */
    }
    const platform = typeof body.platform === "string" ? body.platform : "";
    if (body.compositionId !== undefined && (typeof body.compositionId !== "string" || !/^[a-zA-Z0-9-]+$/.test(body.compositionId))) {
      return apiError(req, "无效的成片版本", "Invalid composition ID");
    }
    const compositionId = body.compositionId as string | undefined;
    const target = Object.hasOwn(PLATFORM_SPECS, platform) ? PLATFORM_SPECS[platform] : undefined;
    if (!target) return apiError(req, "不支持的平台", "Unsupported platform");
    let framing;
    try { framing = parseVideoFraming(body.framing); }
    catch { return apiError(req, "构图参数无效，位置应在 0 到 1 之间", "Invalid framing; positions must be between 0 and 1"); }
    if (body.preview !== undefined && typeof body.preview !== "boolean") return apiError(req, "预览参数无效", "Invalid preview option");
    if (body.previewTime !== undefined && (typeof body.previewTime !== "number" || !Number.isFinite(body.previewTime) || body.previewTime < 0)) {
      return apiError(req, "预览时间无效", "Invalid preview time");
    }

    // Fetch the most recent *successful* composition — a failed retry on top must not hide a good take
    const db = getDb();
    const rows = await db
      .select()
      .from(compositions)
      .where(
        compositionId
          ? and(eq(compositions.projectId, id), eq(compositions.id, compositionId), eq(compositions.status, "done"))
          : and(eq(compositions.projectId, id), eq(compositions.status, "done"))
      )
      .orderBy(desc(compositions.createdAt))
      .limit(1);
    const selectedComposition = rows[0];
    const src = selectedComposition?.outputPath;
    if (!src || !existsSync(src)) {
      return compositionId
        ? apiError(req, "所选成片不可用，请选择其他已完成版本", "Selected composition is unavailable; choose another completed version")
        : apiError(req, "还没有成片，请先合成视频", "No composed video yet; please compose the video first");
    }

    const { w, h } = target;
    if (body.preview === true) {
      const source = await probeEncodeStats(src, { signal: req.signal });
      const time = Math.min((body.previewTime as number | undefined) ?? 0, Math.max(0, source.durationSec - 0.1));
      const preview = await previewPlatformExport({ sourcePath: src, target, framing, time, signal: req.signal });
      return NextResponse.json({ success: true, compositionId: selectedComposition.id, platform, framing, preview, previewTime: time, duration: source.durationSec, size: `${w}x${h}` });
    }
    const outFile = join(getDataDir(), "output", id, `${platform}-${crypto.randomUUID()}.mp4`);
    const report = await renderPlatformExport({ sourcePath: src, outputPath: outFile, target, framing, signal: req.signal });

    // separator-agnostic: join() produces backslash paths on Windows (issue #15)
    const fileName = fileNameOf(outFile);
    return NextResponse.json({
      success: true,
      framing,
      platform,
      // Return the actual selected version even when the caller asked for "latest".
      // This makes a default export auditable and lets CLI/MCP pin the exact result.
      compositionId: selectedComposition?.id ?? null,
      platformName: target.name,
      url: `/api/output/${id}/${fileName}`,
      size: `${w}x${h}`,
      report,
    });
  } catch (error) {
    if (req.signal.aborted) return apiError(req, "导出已取消", "Export cancelled", 499);
    console.error("多平台导出失败:", error);
    return NextResponse.json(
      { error: errText(req, "导出失败，请检查素材和磁盘空间后重试", "Export failed; check the source and available disk space, then retry") },
      { status: 500 }
    );
  }
}
