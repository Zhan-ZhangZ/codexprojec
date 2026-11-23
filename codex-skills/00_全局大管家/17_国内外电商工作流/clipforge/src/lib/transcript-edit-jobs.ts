import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { compositions, mediaEdits, type mediaSources } from "@/lib/db/schema";
import type { TranscriptDocument } from "@/lib/transcript-editor";
import type { TranscriptEditProposal } from "@/lib/transcript-edit-protocol";
import { startTranscriptRender } from "@/lib/transcript-render-runner";

/** One transaction reserves all revision numbers; either every batch item is queued or none is. */
export function enqueueTranscriptEdits(source: typeof mediaSources.$inferSelect, transcript: TranscriptDocument, items: { proposal: TranscriptEditProposal; label?: string }[], batchId?: string) {
  const db = getDb();
  const created = db.transaction((tx) => {
    const latest = tx.select().from(mediaEdits).where(eq(mediaEdits.sourceId, source.id)).orderBy(desc(mediaEdits.revision)).get();
    if ((latest?.revision ?? 0) !== items[0].proposal.latestRevision) throw new Error("EDIT_REVISION_CONFLICT");
    if (tx.select({ id: mediaEdits.id }).from(mediaEdits).where(and(eq(mediaEdits.sourceId, source.id), inArray(mediaEdits.status, ["queued", "rendering"]))).get()) throw new Error("EDIT_BUSY");
    return items.map(({ proposal, label }, index) => {
      if (proposal.summary.outputDuration < 0.5) throw new Error("EDIT_TOO_SHORT");
      const revision = proposal.latestRevision + index + 1;
      const ratio = source.width / Math.max(1, source.height);
      const composition = tx.insert(compositions).values({
        projectId: source.projectId, resolution: Math.min(source.width, source.height) >= 1000 ? "1080p" : "720p",
        aspectRatio: ratio > 1.2 ? "16:9" : ratio < 0.8 ? "9:16" : "1:1", duration: Math.round(proposal.summary.outputDuration * 1000),
        ttsEnabled: false, aigcBadge: false, label: label?.trim().slice(0, 80) || `Text edit · R${revision}`, status: "composing",
      }).returning().get();
      const now = new Date();
      const edit = tx.insert(mediaEdits).values({
        projectId: source.projectId, sourceId: source.id, revision, operationId: proposal.operationId,
        baseRevision: proposal.baseRevision, actor: proposal.actor, plan: proposal.plan, keepRanges: proposal.keepRanges,
        summary: proposal.summary, compositionId: composition.id, status: "queued", attemptId: crypto.randomUUID(),
        heartbeatAt: now, transcriptSnapshot: transcript, batchId: batchId ?? null,
      }).returning().get();
      return { edit, composition };
    });
  });
  created.forEach(({ edit }) => startTranscriptRender(edit.id));
  return created;
}
