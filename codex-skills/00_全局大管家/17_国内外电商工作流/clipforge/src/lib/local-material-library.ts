import { createHash, randomUUID } from "crypto";
import { constants, createWriteStream } from "fs";
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  rename,
  rm,
  writeFile,
} from "fs/promises";
import { join } from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { probeMedia } from "@/lib/media-probe";
import {
  classifyMaterial,
  MATERIAL_MAX_BYTES,
  materialDisplayName,
  materialExtension,
  materialTags,
  type LocalMaterial,
} from "@/lib/material-library";

const META_SUFFIX = ".clipforge.json";
const SAFE_NAME = /^[^/\\\u0000-\u001f]+$/;
type Metadata = Pick<
  LocalMaterial,
  "originalName" | "tags" | "width" | "height" | "durationSec"
>;

export function isMaterialName(name: string): boolean {
  return (
    SAFE_NAME.test(name) &&
    !!classifyMaterial(name) &&
    !/\.(mp4|webm|mov|m4v)\.last\.jpg$/i.test(name)
  );
}
async function readMetadata(
  dir: string,
  name: string,
): Promise<Partial<Metadata>> {
  const path = join(dir, name + META_SUFFIX);
  let handle;
  try {
    // A hand-managed library can contain links and unrelated JSON; neither is trusted metadata.
    const info = await lstat(path);
    if (!info.isFile() || info.size > 16 * 1024) return {};
    handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const body = JSON.parse(await handle.readFile("utf8"));
    return {
      originalName:
        typeof body.originalName === "string"
          ? materialDisplayName(body.originalName)
          : undefined,
      tags: materialTags(body.tags ?? []),
      ...Object.fromEntries(
        ["width", "height", "durationSec"]
          .filter((key) => Number.isFinite(body[key]) && body[key] > 0)
          .map((key) => [key, body[key]]),
      ),
    };
  } catch {
    return {};
  } finally {
    await handle?.close();
  }
}
export async function readLocalMaterial(
  dir: string,
  name: string,
): Promise<LocalMaterial | null> {
  if (!isMaterialName(name)) return null;
  try {
    const info = await lstat(join(dir, name));
    if (!info.isFile()) return null;
    const meta = await readMetadata(dir, name);
    return {
      ...meta,
      name,
      mediaType: classifyMaterial(name)!,
      originalName: meta.originalName || name,
      tags: meta.tags ?? [],
      sizeBytes: info.size,
      updatedAt: info.mtimeMs,
    };
  } catch {
    return null;
  }
}
export async function listLocalMaterials(
  dir: string,
): Promise<LocalMaterial[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const names = entries
    .filter((entry) => entry.isFile() && isMaterialName(entry.name))
    .map((entry) => entry.name);
  const result: LocalMaterial[] = [];
  // Bound filesystem concurrency even in libraries with thousands of clips.
  for (let offset = 0; offset < names.length; offset += 16) {
    const rows = await Promise.all(
      names
        .slice(offset, offset + 16)
        .map((name) => readLocalMaterial(dir, name)),
    );
    for (const row of rows) if (row) result.push(row);
  }
  return result.sort(
    (a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name),
  );
}
export async function updateMaterialMetadata(
  dir: string,
  name: string,
  originalName: string,
  tags: unknown,
): Promise<LocalMaterial> {
  const cleanedTags = materialTags(tags);
  const cleanedName = materialDisplayName(originalName);
  if (!cleanedName || cleanedName !== originalName.trim())
    throw new Error("INVALID_NAME");
  const current = await readLocalMaterial(dir, name);
  if (!current) throw new Error("MATERIAL_NOT_FOUND");
  const meta: Metadata = {
    originalName: cleanedName,
    tags: cleanedTags,
    width: current.width,
    height: current.height,
    durationSec: current.durationSec,
  };
  const temp = join(dir, `.${randomUUID()}.meta.tmp`);
  try {
    await writeFile(temp, JSON.stringify(meta), { flag: "wx" });
    await rename(temp, join(dir, name + META_SUFFIX));
  } finally {
    await rm(temp, { force: true });
  }
  return { ...current, ...meta };
}

/** Stream, inspect, hash and publish one complete file. Partial writes never enter the pool. */
export async function storeLocalMaterial(
  dir: string,
  originalName: string,
  stream: ReadableStream<Uint8Array>,
  options: { signal?: AbortSignal; expectedBytes?: number } = {},
): Promise<{ material: LocalMaterial; duplicate: boolean }> {
  const displayName = materialDisplayName(originalName);
  const mediaType = classifyMaterial(displayName);
  if (!mediaType) throw new Error("UNSUPPORTED_MATERIAL");
  if (
    options.expectedBytes !== undefined &&
    (!Number.isSafeInteger(options.expectedBytes) ||
      options.expectedBytes < 1 ||
      options.expectedBytes > MATERIAL_MAX_BYTES)
  )
    throw new Error("MATERIAL_SIZE");
  options.signal?.throwIfAborted();
  await mkdir(dir, { recursive: true });
  const ext = materialExtension(displayName).replace(/^jpeg$/, "jpg");
  const temp = join(dir, `.${randomUUID()}.part`);
  const hash = createHash("sha256");
  let received = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > MATERIAL_MAX_BYTES)
        return callback(new Error("MATERIAL_SIZE"));
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0]),
      guard,
      createWriteStream(temp, { flags: "wx" }),
      { signal: options.signal },
    );
    if (
      !received ||
      (options.expectedBytes !== undefined &&
        received !== options.expectedBytes)
    )
      throw new Error("INCOMPLETE_MATERIAL");
    let metadata;
    try {
      metadata = await probeMedia(temp, { signal: options.signal });
    } catch {
      options.signal?.throwIfAborted();
      throw new Error("INVALID_MATERIAL");
    }
    if (
      !(metadata.width > 0 && metadata.height > 0) ||
      (mediaType === "video" &&
        !(Number.isFinite(metadata.duration) && metadata.duration > 0))
    )
      throw new Error("INVALID_MATERIAL");
    const expectedCodec = { jpg: "mjpeg", png: "png", webp: "webp" }[ext];
    const expectedFormat = ext === "webm" ? "webm" : "mov";
    if (
      mediaType === "image"
        ? metadata.videoCodec !== expectedCodec
        : !metadata.formatName?.split(",").includes(expectedFormat)
    )
      throw new Error("INVALID_MATERIAL");
    options.signal?.throwIfAborted();
    const name = `sha256-${hash.digest("hex")}.${ext}`;
    let duplicate = false;
    try {
      await link(temp, join(dir, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      duplicate = true;
    }
    const meta: Metadata = {
      originalName: displayName,
      tags: [],
      width: metadata.width,
      height: metadata.height,
      durationSec: metadata.duration || undefined,
    };
    try {
      await writeFile(join(dir, name + META_SUFFIX), JSON.stringify(meta), {
        flag: "wx",
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const material = await readLocalMaterial(dir, name);
    if (!material) throw new Error("MATERIAL_NOT_FOUND");
    return { material, duplicate };
  } finally {
    await rm(temp, { force: true });
  }
}
