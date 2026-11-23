import { and, eq, inArray, lt, or, isNull } from "drizzle-orm";
import { rm } from "fs/promises";
import { join } from "path";
import { getDb } from "@/lib/db";
import { compositions, mediaEdits, mediaSources, projects } from "@/lib/db/schema";
import { getOutputDir } from "@/lib/paths";
import { renderTranscriptEdit } from "@/lib/transcript-render";
import { extractFirstFrame } from "@/lib/video-composer/frame-extract";

type Edit = typeof mediaEdits.$inferSelect;
const registry = globalThis as typeof globalThis & { clipforgeTranscriptRenders?: Map<string, { attemptId: string; controller: AbortController }> };
const activeRenders = registry.clipforgeTranscriptRenders ??= new Map();
export const TRANSCRIPT_LEASE_MS = 45_000;
const activeStatuses = ["queued", "rendering"] as const;

export function publicTranscriptEdit(edit: Edit) {
  // The immutable transcript is for retry, not repeated in every list response.
  const { transcriptSnapshot: _snapshot, heartbeatAt: _heartbeat, attemptId: _attempt, ...visible } = edit;
  void _snapshot; void _heartbeat; void _attempt;
  return visible;
}

/** Heartbeats work across route bundles/processes; absence from a local registry is not a failure. */
export function reconcileTranscriptRenders(projectId?: string, now = new Date()): void {
  const db = getDb();
  const cutoff = new Date(now.getTime() - TRANSCRIPT_LEASE_MS);
  db.transaction((tx) => {
    const stale = tx.select().from(mediaEdits).where(and(
      inArray(mediaEdits.status, [...activeStatuses]),
      projectId ? eq(mediaEdits.projectId, projectId) : undefined,
      or(lt(mediaEdits.heartbeatAt, cutoff), and(isNull(mediaEdits.heartbeatAt), or(lt(mediaEdits.updatedAt, cutoff), isNull(mediaEdits.updatedAt)))),
    )).all();
    for (const edit of stale) {
      tx.update(mediaEdits).set({ status: "failed", error: "RENDER_INTERRUPTED", updatedAt: now }).where(eq(mediaEdits.id, edit.id)).run();
      if (edit.compositionId) tx.update(compositions).set({ status: "failed" }).where(eq(compositions.id, edit.compositionId)).run();
    }
  });
}

export function cancelTranscriptRender(editId: string): Edit | undefined {
  const db = getDb();
  const edit = db.transaction((tx) => {
    const row = tx.select().from(mediaEdits).where(eq(mediaEdits.id, editId)).get();
    if (!row || !activeStatuses.includes(row.status as typeof activeStatuses[number])) return row;
    const updated = tx.update(mediaEdits).set({ status: "cancelled", error: null, updatedAt: new Date() }).where(eq(mediaEdits.id, editId)).returning().get();
    if (row.compositionId) tx.update(compositions).set({ status: "failed" }).where(eq(compositions.id, row.compositionId)).run();
    return updated;
  });
  activeRenders.get(editId)?.controller.abort(new Error("RENDER_CANCELLED"));
  return edit;
}

export function retryTranscriptRender(editId: string): Edit {
  const db = getDb();
  const edit = db.transaction((tx) => {
    const row = tx.select().from(mediaEdits).where(eq(mediaEdits.id, editId)).get();
    if (!row || (row.status !== "failed" && row.status !== "cancelled")) throw new Error("EDIT_NOT_RETRYABLE");
    if (!row.transcriptSnapshot || !row.compositionId) throw new Error("EDIT_SNAPSHOT_MISSING");
    const now = new Date();
    const updated = tx.update(mediaEdits).set({ status: "queued", progress: 0, error: null, attemptId: crypto.randomUUID(), heartbeatAt: now, updatedAt: now }).where(eq(mediaEdits.id, editId)).returning().get();
    tx.update(compositions).set({ status: "composing", outputPath: null, thumbnailPath: null }).where(eq(compositions.id, row.compositionId)).run();
    return updated;
  });
  startTranscriptRender(edit.id);
  return edit;
}

export function startTranscriptRender(editId: string): void {
  const db = getDb();
  const edit = db.select().from(mediaEdits).where(eq(mediaEdits.id, editId)).get();
  if (!edit?.attemptId || !edit.compositionId || !edit.transcriptSnapshot || edit.status !== "queued") return;
  const source = db.select().from(mediaSources).where(eq(mediaSources.id, edit.sourceId)).get();
  if (!source) return;
  const previous = activeRenders.get(editId);
  if (previous?.attemptId === edit.attemptId) return;
  previous?.controller.abort(new Error("RENDER_SUPERSEDED"));
  const controller = new AbortController();
  const attemptId = edit.attemptId;
  const compositionId = edit.compositionId;
  const transcript = edit.transcriptSnapshot;
  activeRenders.set(editId, { attemptId, controller });
  const ownAttempt = and(eq(mediaEdits.id, editId), eq(mediaEdits.attemptId, attemptId), inArray(mediaEdits.status, [...activeStatuses]));
  let progress = 0;
  let started = false;
  const heartbeat = () => {
    try {
      const result = db.update(mediaEdits).set({ progress, status: started ? "rendering" : "queued", heartbeatAt: new Date(), updatedAt: new Date() }).where(ownAttempt).run();
      if (!result.changes) controller.abort(new Error("RENDER_CANCELLED"));
    } catch { controller.abort(new Error("RENDER_STATE_UNAVAILABLE")); }
  };
  const timer = setInterval(heartbeat, 5_000);
  timer.unref();
  void (async () => {
    const outputPath = join(getOutputDir(), source.projectId, `text-edit-r${edit.revision}-${attemptId}.mp4`);
    let thumbnailPath: string | null | undefined;
    let committed = false;
    try {
      await renderTranscriptEdit({
        projectId: source.projectId, sourcePath: source.filePath, sourceWidth: source.width,
        sourceHeight: source.height, hasAudio: source.hasAudio, transcript, plan: edit.plan,
        keepRanges: edit.keepRanges, outputPath, signal: controller.signal,
        onStart: () => { started = true; progress = 1; heartbeat(); },
        onProgress: (value) => { progress = Math.max(progress, value); },
      });
      controller.signal.throwIfAborted();
      thumbnailPath = await extractFirstFrame(outputPath);
      controller.signal.throwIfAborted();
      committed = db.transaction((tx) => {
        const updated = tx.update(mediaEdits).set({ status: "done", progress: 100, error: null, updatedAt: new Date() }).where(ownAttempt).run();
        if (!updated.changes) return false;
        tx.update(compositions).set({ outputPath, status: "done", ...(thumbnailPath && { thumbnailPath }) }).where(eq(compositions.id, compositionId)).run();
        tx.update(projects).set({ status: "done", updatedAt: new Date() }).where(eq(projects.id, source.projectId)).run();
        return true;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "RENDER_FAILED";
      try {
        db.transaction((tx) => {
          const updated = tx.update(mediaEdits).set({ status: "failed", error: message.slice(0, 500), updatedAt: new Date() }).where(ownAttempt).run();
          if (updated.changes) tx.update(compositions).set({ status: "failed" }).where(eq(compositions.id, compositionId)).run();
        });
      } catch { /* The lease makes a lost database connection recoverable on the next read. */ }
    } finally {
      clearInterval(timer);
      if (activeRenders.get(editId)?.attemptId === attemptId) activeRenders.delete(editId);
      if (!committed) await Promise.all([rm(outputPath, { force: true }).catch(() => {}), thumbnailPath ? rm(thumbnailPath, { force: true }).catch(() => {}) : Promise.resolve()]);
    }
  })();
}
