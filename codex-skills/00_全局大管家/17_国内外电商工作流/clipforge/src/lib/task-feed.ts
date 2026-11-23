export interface TaskRow {
  kind: "transcript" | "transcript_failed" | "batch" | "paid" | "paid_unknown" | "pipeline" | "pipeline_interrupted" | "pipeline_failed" | "compose" | "done";
  id: string;
  projectId?: string | null;
  projectName?: string;
  progress?: number;
  revision?: number;
  sourceId?: string;
  stage?: string;
  label?: string | null;
  provider?: string;
  model?: string;
  total?: number;
  done?: number;
  failed?: number;
  createdAt?: string | null;
}

export interface TaskFeed { active: TaskRow[]; attention: TaskRow[]; recent: TaskRow[] }
export const EMPTY_TASK_FEED: TaskFeed = { active: [], attention: [], recent: [] };

/** 失败响应或错误形状不能被解释为“没有任务”。 */
export function parseTaskFeed(value: unknown): TaskFeed {
  const raw = value as Partial<TaskFeed> | null;
  const kinds = new Set<TaskRow["kind"]>(["transcript", "transcript_failed", "batch", "paid", "paid_unknown", "pipeline", "pipeline_interrupted", "pipeline_failed", "compose", "done"]);
  if (!raw || ![raw.active, raw.attention, raw.recent].every((rows) => Array.isArray(rows)
    && rows.every((row) => row && typeof row.id === "string" && row.id.length > 0 && kinds.has(row.kind)))) {
    throw new Error("INVALID_TASK_FEED");
  }
  return { active: raw.active!, attention: raw.attention!, recent: raw.recent! };
}

export function taskHref(row: TaskRow): string {
  const project = row.projectId ? `/project/${encodeURIComponent(row.projectId)}` : null;
  switch (row.kind) {
    case "batch": return "/batch";
    case "transcript":
    case "transcript_failed": return project ? `${project}/transcript${row.sourceId ? `?source=${encodeURIComponent(row.sourceId)}` : ""}` : "/projects";
    case "paid":
    case "paid_unknown": return project ? `${project}/assets` : "/projects";
    case "pipeline":
    case "pipeline_failed":
    case "pipeline_interrupted": return project ? `${project}/script` : "/projects";
    case "done": return project ? `${project}/export` : "/projects";
    default: return project ? `${project}/video` : "/projects";
  }
}
