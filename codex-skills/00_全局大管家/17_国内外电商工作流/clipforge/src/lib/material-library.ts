/** Shared, serializable contract for project-owned footage. */
export const MATERIAL_MAX_BYTES = 80 * 1024 * 1024;
export const MATERIAL_ACCEPT = ".mp4,.webm,.mov,.m4v,.jpg,.jpeg,.png,.webp";
export const LOCAL_VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"]);
export const LOCAL_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export interface LocalMaterial {
  name: string;
  originalName: string;
  mediaType: "video" | "image";
  tags: string[];
  sizeBytes: number;
  updatedAt: number;
  width?: number;
  height?: number;
  durationSec?: number;
}
export interface PublicLocalMaterial extends LocalMaterial {
  url: string;
}

export function materialExtension(name: string): string {
  return (
    name.split(/[\\/]/).pop()?.split(".").slice(1).pop()?.toLowerCase() ?? ""
  );
}
export function classifyMaterial(name: string): "video" | "image" | null {
  const ext = materialExtension(name);
  return LOCAL_VIDEO_EXT.has(ext)
    ? "video"
    : LOCAL_IMAGE_EXT.has(ext)
      ? "image"
      : null;
}
export function materialDisplayName(value: string): string {
  return (
    value
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 240) ?? ""
  );
}
export function materialTags(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 12 ||
    value.some((tag) => typeof tag !== "string" || tag.trim().length > 32)
  ) {
    throw new Error("INVALID_TAGS");
  }
  return [...new Set(value.map((tag: string) => tag.trim()).filter(Boolean))];
}

/** Whole English tokens and contained CJK phrases, without treating a hash as a title. */
export function materialMatchScore(text: string, query: string): number {
  const tokens = (s: string) =>
    s
      .normalize("NFKC")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((v) => v.length >= 2);
  const haystack = tokens(text),
    wanted = new Set(tokens(query));
  let score = 0;
  for (const token of wanted)
    if (
      haystack.some(
        (part) =>
          part === token ||
          (/[\u3400-\u9fff]/.test(token) && part.includes(token)),
      )
    )
      score++;
  return score;
}
