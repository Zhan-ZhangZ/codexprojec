import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { getDb } from "@/lib/db";
import { mediaEdits, mediaSources } from "@/lib/db/schema";
import { DEFAULT_TRANSCRIPT_EDIT_PLAN, sanitizeTranscriptDocument } from "@/lib/transcript-editor";
import { createTranscriptEditProposal } from "@/lib/transcript-edit-protocol";
import { enqueueTranscriptEdits } from "@/lib/transcript-edit-jobs";
import { publicTranscriptEdit, reconcileTranscriptRenders } from "@/lib/transcript-render-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await params;
  if (![id, mediaId].every((value) => /^[a-zA-Z0-9-]+$/.test(value))) return apiError(req, "素材 ID 无效", "Invalid media ID", 400);
  try {
    const body = await req.json();
    if (!["preview", "apply"].includes(body.action) || typeof body.batchId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(body.batchId)
      || !Number.isInteger(body.baseRevision) || body.baseRevision < 0 || !Array.isArray(body.items) || !body.items.length || body.items.length > 12
      || body.items.some((item: { label?: unknown; plan?: unknown } | null) => !item || typeof item.label !== "string" || !item.label.trim() || item.label.length > 80 || !item.plan)) {
      return apiError(req, "批次需要 1–12 条命名片段和有效的基础版本", "A batch needs 1–12 named clips and a valid base revision", 422);
    }
    reconcileTranscriptRenders(id);
    const db = getDb();
    const source = db.select().from(mediaSources).where(and(eq(mediaSources.id, mediaId), eq(mediaSources.projectId, id))).get();
    if (!source) return apiError(req, "素材不存在", "Source not found", 404);
    const existing = db.select().from(mediaEdits).where(and(eq(mediaEdits.batchId, body.batchId), eq(mediaEdits.sourceId, mediaId))).orderBy(asc(mediaEdits.revision)).all();
    if (body.action === "apply" && existing.length) return NextResponse.json({ idempotent: true, edits: existing.map(publicTranscriptEdit) });
    const transcript = sanitizeTranscriptDocument(source.transcript, source.duration / 1000);
    if (source.status !== "ready" || !transcript) return apiError(req, "请先完成转写", "Complete transcription first", 409);
    const latest = db.select().from(mediaEdits).where(eq(mediaEdits.sourceId, mediaId)).orderBy(desc(mediaEdits.revision)).get();
    const items = body.items.map((item: { plan: unknown; label: string }, index: number) => ({
      label: item.label.trim(), proposal: createTranscriptEditProposal({ document: transcript, latestRevision: latest?.revision ?? 0,
        basePlan: latest?.plan ?? DEFAULT_TRANSCRIPT_EDIT_PLAN, fallbackOperationId: `${body.batchId}:${index}`,
        value: { plan: item.plan, operationId: `${body.batchId}:${index}`, baseRevision: body.baseRevision, actor: "human" } }),
    }));
    if (body.action === "preview") return NextResponse.json({ batchId: body.batchId, items });
    if (items.some((item: { proposal: { conflict: boolean } }) => item.proposal.conflict)) return apiError(req, "版本已变化，请重新预演", "Revision changed; preview again", 409);
    const created = enqueueTranscriptEdits(source, transcript, items, body.batchId);
    return NextResponse.json({ batchId: body.batchId, edits: created.map(({ edit }) => publicTranscriptEdit(edit)) }, { status: 202 });
  } catch (error) {
    if (error instanceof RangeError || (error instanceof Error && error.message === "EDIT_TOO_SHORT")) return apiError(req, "片段计划无效或不足 0.5 秒", "Invalid clip plan or less than 0.5 seconds remains", 422);
    if (error instanceof Error && /EDIT_BUSY|EDIT_REVISION_CONFLICT|UNIQUE constraint/.test(error.message)) return apiError(req, "版本已变化或已有输出任务，请稍后重新预演", "Revision changed or renders are active; preview again later", 409);
    return apiError(req, "批量输出请求失败", "Batch request failed", 500);
  }
}
