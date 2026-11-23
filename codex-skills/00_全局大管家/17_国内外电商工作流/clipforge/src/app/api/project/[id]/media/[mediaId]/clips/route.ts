import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { getDb } from "@/lib/db";
import { mediaEdits, mediaSources } from "@/lib/db/schema";
import { suggestTranscriptClips } from "@/lib/transcript-clips";
import { sanitizeTranscriptDocument } from "@/lib/transcript-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(id) || !/^[a-zA-Z0-9-]+$/.test(mediaId)) return apiError(req, "无效的素材 ID", "Invalid media ID", 400);
  const query = req.nextUrl.searchParams.get("query") ?? "";
  const targetSeconds = Number(req.nextUrl.searchParams.get("targetSeconds") ?? 30);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 6);
  if (query.length > 160 || !Number.isFinite(targetSeconds) || targetSeconds < 5 || targetSeconds > 120
    || !Number.isInteger(limit) || limit < 1 || limit > 12) {
    return apiError(req, "关键词最多 160 字，时长为 5–120 秒，数量为 1–12", "Use up to 160 characters, 5–120 seconds and 1–12 candidates", 400);
  }
  try {
    const db = getDb();
    const [source] = await db.select().from(mediaSources).where(and(eq(mediaSources.id, mediaId), eq(mediaSources.projectId, id))).limit(1);
    if (!source) return apiError(req, "素材不存在", "Media source not found", 404);
    const document = sanitizeTranscriptDocument(source.transcript, source.duration / 1000);
    if (source.status !== "ready" || !document) return apiError(req, "请先完成本地转写", "Complete local transcription first", 409);
    const [latest] = await db.select({ revision: mediaEdits.revision }).from(mediaEdits)
      .where(eq(mediaEdits.sourceId, mediaId)).orderBy(desc(mediaEdits.revision)).limit(1);
    return NextResponse.json({
      projectId: id, mediaId, latestRevision: latest?.revision ?? 0,
      ...suggestTranscriptClips(document, { query, targetSeconds, limit }),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return apiError(req, "读取片段建议失败", "Failed to find transcript clips", 500);
  }
}
