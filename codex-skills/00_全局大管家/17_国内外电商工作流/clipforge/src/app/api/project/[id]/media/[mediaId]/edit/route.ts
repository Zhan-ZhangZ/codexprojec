import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, errText } from "@/lib/api-error";
import { getDb } from "@/lib/db";
import { mediaEdits, mediaSources } from "@/lib/db/schema";
import { createTranscriptEditProposal } from "@/lib/transcript-edit-protocol";
import { cancelTranscriptRender, retryTranscriptRender, reconcileTranscriptRenders, publicTranscriptEdit } from "@/lib/transcript-render-runner";
import { enqueueTranscriptEdits } from "@/lib/transcript-edit-jobs";
import {
  DEFAULT_TRANSCRIPT_EDIT_PLAN,
  sanitizeTranscriptDocument,
} from "@/lib/transcript-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_ID = /^[a-zA-Z0-9-]+$/;

function boundedInteger(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || !value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const { id, mediaId } = await params;
  if (!SAFE_ID.test(id) || !SAFE_ID.test(mediaId)) return apiError(req, "无效的素材ID", "Invalid media ID", 400);
  try {
    reconcileTranscriptRenders(id);
    const db = getDb();
    const [source] = await db.select().from(mediaSources)
      .where(and(eq(mediaSources.id, mediaId), eq(mediaSources.projectId, id))).limit(1);
    if (!source) return apiError(req, "素材不存在", "Media source not found", 404);
    const [latest] = await db.select().from(mediaEdits)
      .where(eq(mediaEdits.sourceId, source.id)).orderBy(desc(mediaEdits.revision)).limit(1);
    const transcript = sanitizeTranscriptDocument(source.transcript, source.duration / 1000);
    const offset = boundedInteger(req.nextUrl.searchParams.get("offset"), 0, 0, 100_000);
    const limit = boundedInteger(req.nextUrl.searchParams.get("limit"), 500, 1, 2_000);
    const words = transcript?.words.slice(offset, offset + limit) ?? [];
    return NextResponse.json({
      source: {
        id: source.id,
        projectId: source.projectId,
        originalName: source.originalName,
        mimeType: source.mimeType,
        sizeBytes: source.sizeBytes,
        duration: source.duration,
        width: source.width,
        height: source.height,
        hasAudio: source.hasAudio,
        status: source.status,
        language: source.language,
        model: source.model,
        device: source.device,
      },
      transcript: transcript ? {
        version: transcript.version,
        language: transcript.language,
        duration: transcript.duration,
        model: transcript.model,
        device: transcript.device,
        words,
        wordOffset: offset,
        wordLimit: limit,
        totalWords: transcript.words.length,
        hasMore: offset + words.length < transcript.words.length,
        silenceRanges: transcript.silenceRanges,
        createdAt: transcript.createdAt,
      } : null,
      latestRevision: latest?.revision ?? 0,
      latestPlan: latest?.plan ?? DEFAULT_TRANSCRIPT_EDIT_PLAN,
      latestEdit: latest ? {
        id: latest.id,
        revision: latest.revision,
        operationId: latest.operationId,
        baseRevision: latest.baseRevision,
        actor: latest.actor,
        status: latest.status,
        progress: latest.progress,
        error: latest.error,
        batchId: latest.batchId,
        summary: latest.summary,
        compositionId: latest.compositionId,
        createdAt: latest.createdAt,
      } : null,
    });
  } catch (error) {
    console.error("Transcript edit inspect failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : errText(req, "读取剪辑计划失败", "Failed to inspect edit plan") }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const { id, mediaId } = await params;
  if (!SAFE_ID.test(id) || !SAFE_ID.test(mediaId)) return apiError(req, "无效的素材ID", "Invalid media ID", 400);
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = body.action === undefined ? "apply" : body.action;
    if (!["preview", "apply", "cancel", "retry"].includes(String(action))) return apiError(req, "不支持的剪辑操作", "Unsupported edit action", 400);

    reconcileTranscriptRenders(id);
    const db = getDb();
    const [source] = await db.select().from(mediaSources)
      .where(and(eq(mediaSources.id, mediaId), eq(mediaSources.projectId, id))).limit(1);
    if (!source) return apiError(req, "素材不存在", "Media source not found", 404);
    if (action === "cancel" || action === "retry") {
      if (typeof body.editId !== "string") return apiError(req, "缺少版本 ID", "Edit ID required", 400);
      const row = db.select().from(mediaEdits).where(and(eq(mediaEdits.id, body.editId), eq(mediaEdits.sourceId, source.id))).get();
      if (!row) return apiError(req, "版本不存在", "Edit not found", 404);
      const edit = action === "cancel" ? cancelTranscriptRender(row.id) : retryTranscriptRender(row.id);
      return NextResponse.json({ edit: edit ? publicTranscriptEdit(edit) : null }, { status: action === "retry" ? 202 : 200 });
    }
    const transcript = sanitizeTranscriptDocument(source.transcript, source.duration / 1000);
    if (source.status !== "ready" || !transcript) return apiError(req, "请先完成本地转写", "Complete local transcription first", 409);

    const [latest] = await db.select().from(mediaEdits)
      .where(eq(mediaEdits.sourceId, source.id)).orderBy(desc(mediaEdits.revision)).limit(1);
    const fallbackOperationId = crypto.randomUUID();
    const proposal = createTranscriptEditProposal({
      document: transcript,
      value: {
        ...body,
        actor: body.actor ?? "human",
        operationId: body.operationId ?? fallbackOperationId,
      },
      basePlan: latest?.plan ?? DEFAULT_TRANSCRIPT_EDIT_PLAN,
      latestRevision: latest?.revision ?? 0,
      fallbackOperationId,
    });

    if (action === "preview") return NextResponse.json({ proposal });

    const [existing] = await db.select().from(mediaEdits)
      .where(and(eq(mediaEdits.operationId, proposal.operationId), eq(mediaEdits.sourceId, source.id))).limit(1);
    if (existing) {
      return NextResponse.json({
        idempotent: true,
        edit: publicTranscriptEdit(existing),
        compositionId: existing.compositionId,
        status: existing.status,
      });
    }
    if (proposal.conflict) {
      return NextResponse.json({
        error: errText(req, `剪辑版本已更新到 R${proposal.latestRevision}，请重新预演`, `The edit advanced to R${proposal.latestRevision}; preview again`),
        proposal,
      }, { status: 409 });
    }
    if (proposal.summary.outputDuration < 0.5) return apiError(req, "保留内容不足 0.5 秒", "Less than 0.5 seconds of content remains", 422);
    if (latest?.status === "queued" || latest?.status === "rendering") {
      return apiError(req, "已有剪辑版本正在生成，请完成后再试", "Another edit version is rendering", 409);
    }

    const [created] = enqueueTranscriptEdits(source, transcript, [{ proposal }]);
    return NextResponse.json({ proposal, edit: publicTranscriptEdit(created.edit), compositionId: created.composition.id, status: "queued" }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && ["EDIT_NOT_RETRYABLE", "EDIT_SNAPSHOT_MISSING"].includes(error.message)) return apiError(req, "此版本无法重试，请载入计划重新输出", "Load this version as a draft to render it again", 409);
    if (error instanceof RangeError && error.message === "INVALID_CAPTION_REPLACEMENTS") return apiError(req, "字幕校对内容无效，请检查后重试", "Invalid caption corrections", 422);
    if (error instanceof RangeError && error.message === "INVALID_TRANSCRIPT_SOURCE_RANGE") return apiError(req, "保留区间无效或超出原片时长", "Invalid source range or range exceeds source duration", 422);
    if (error instanceof Error && error.message === "EDIT_REVISION_CONFLICT") {
      return apiError(req, "剪辑版本已变化，请重新预演", "The edit revision changed; preview again", 409);
    }
    if (error instanceof Error && error.message === "EDIT_BUSY") {
      return apiError(req, "已有剪辑版本正在生成，请完成后再试", "Another edit version is rendering", 409);
    }
    if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
      return apiError(req, "相同剪辑操作已提交或版本已变化", "This edit was already submitted or the revision changed", 409);
    }
    console.error("Transcript edit start failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : errText(req, "启动文字剪辑失败", "Failed to start text edit") }, { status: 500 });
  }
}
