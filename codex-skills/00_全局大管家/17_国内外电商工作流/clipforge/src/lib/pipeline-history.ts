import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/schema";

/** 秒级时间戳相同时以插入顺序定先后，避免恢复到上一轮失败记录。 */
export function getLatestPipelineRun(projectId: string) {
  return getDb().select().from(pipelineRuns).where(eq(pipelineRuns.projectId, projectId))
    .orderBy(desc(pipelineRuns.createdAt), desc(sql`${pipelineRuns}.rowid`)).get();
}

/** 每个项目只展示最近一轮；失败提示保留到新一轮接替它为止。 */
export function listLatestPipelineRuns() {
  return getDb().select().from(pipelineRuns).where(sql`${pipelineRuns.id} IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC, rowid DESC) AS rank
      FROM pipeline_runs
    ) WHERE rank = 1
  )`).all();
}
