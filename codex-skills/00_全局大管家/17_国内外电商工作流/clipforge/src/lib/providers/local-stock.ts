/**
 * Local media source — treats user-supplied videos/images in uploads/{id}/materials/ as stock candidates,
 * enabling "use self-shot / own B-roll" without any network access or API key;
 * the directory is assembled server-side from the project ID, and filenames come from readdir (not user input).
 */

import { join, extname, basename } from "path";
import { listLocalMaterials } from "@/lib/local-material-library";
import { materialMatchScore } from "@/lib/material-library";
export { classifyMaterial, LOCAL_VIDEO_EXT, LOCAL_IMAGE_EXT } from "@/lib/material-library";
import type { StockCandidate, StockMediaType } from "./stock-types";

/**
 * Score the relevance of a filename against a search query (pure function): tokenize both by
 * non-alphanumeric characters and count the number of matching tokens.
 * Example: filename "kitchen_pour_over.mp4" + query "pour over coffee" → hits pour/over = 2.
 */
export function scoreByFilename(fileName: string, query: string): number {
  return materialMatchScore(basename(fileName, extname(fileName)), query);
}

/** Local media file → unified candidate (downloadUrl = absolute path; downloadStockFile handles it as a local copy) */
function toCandidate(absPath: string, name: string, mediaType: StockMediaType): StockCandidate {
  return {
    source: "local",
    mediaType,
    id: name,
    downloadUrl: absPath, // absolute filesystem path, not a network URL
    pageUrl: "",
    author: "本地素材",
    authorUrl: "",
    license: "本地/自有",
    requiresAttribution: false,
    // Legacy files without a sidecar use their filename; metadata is applied during the scan.
    title: name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " "),
  };
}

/**
 * Scan the local media pool directory, prefer the requested type, and rank names and tags by query relevance.
 * Returns [] when the directory does not exist or is empty (so the aggregated search continues with other sources without error).
 * Image files are also accepted as a fallback for video requests; audio is not supported locally.
 */
export async function scanLocalMaterials(
  dir: string,
  query: string,
  opts: { mediaType?: StockMediaType; perPage?: number } = {},
): Promise<StockCandidate[]> {
  const wantType = opts.mediaType ?? "video";
  if (wantType === "audio") return [];

  const materials = await listLocalMaterials(dir);
  const ranked = materials
    .map((item) => ({ item, typeMatch: item.mediaType === wantType ? 0 : 1, score: materialMatchScore(`${item.originalName} ${item.tags.join(" ")}`, query) }))
    .sort((a, b) => a.typeMatch - b.typeMatch || b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => ({
      ...toCandidate(join(dir, item.name), item.name, item.mediaType),
      title: item.originalName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " "),
      tags: item.tags,
      width: item.width,
      height: item.height,
      durationSec: item.durationSec,
    }));
  return opts.perPage ? ranked.slice(0, opts.perPage) : ranked;
}
