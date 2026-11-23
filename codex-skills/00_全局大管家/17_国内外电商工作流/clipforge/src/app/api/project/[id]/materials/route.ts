import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { join } from "path";
import { getDataDir } from "@/lib/paths";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { apiError } from "@/lib/api-error";
import {
  classifyMaterial,
  MATERIAL_MAX_BYTES,
  type LocalMaterial,
} from "@/lib/material-library";
import {
  listLocalMaterials,
  storeLocalMaterial,
  updateMaterialMetadata,
} from "@/lib/local-material-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SAFE_ID = /^[a-zA-Z0-9-]+$/;
const materialsDir = (id: string) =>
  join(getDataDir(), "uploads", id, "materials");
const publicItem = (id: string, item: LocalMaterial) => ({
  ...item,
  url: `/api/files/${id}/materials/${encodeURIComponent(item.name)}`,
});
async function checkProject(req: NextRequest, id: string) {
  if (!SAFE_ID.test(id))
    return apiError(req, "无效的项目ID", "Invalid project ID", 400);
  const [project] = await getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ? null : apiError(req, "项目不存在", "Project not found", 404);
}
function failure(req: NextRequest, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "MATERIAL_SIZE")
    return apiError(
      req,
      "文件不能为空或超过 80MB；旧版多文件请求合计也不能超过 80MB",
      "Files must be nonempty and at most 80 MB; legacy multipart requests also have an 80 MB total limit",
      413,
    );
  if (message === "UNSUPPORTED_MATERIAL")
    return apiError(
      req,
      "仅支持 MP4、WebM、MOV、M4V、JPG、PNG、WebP",
      "Only MP4, WebM, MOV, M4V, JPG, PNG and WebP are supported",
      415,
    );
  if (message === "INVALID_MATERIAL")
    return apiError(
      req,
      "文件无法读取，或真实格式与扩展名不一致",
      "The file cannot be read or its actual format does not match its extension",
      422,
    );
  if (message === "INCOMPLETE_MATERIAL")
    return apiError(
      req,
      "文件未传完，请重试",
      "The upload is incomplete; please retry",
      422,
    );
  if (message === "INVALID_TAGS")
    return apiError(
      req,
      "最多 12 个标签，每个不超过 32 个字符",
      "Use up to 12 tags, at most 32 characters each",
      400,
    );
  if (message === "INVALID_NAME")
    return apiError(
      req,
      "请输入不含路径的素材名称，最长 240 个字符",
      "Enter a material name without a path, up to 240 characters",
      400,
    );
  if (message === "MATERIAL_NOT_FOUND")
    return apiError(req, "素材不存在", "Material not found", 404);
  if (error instanceof SyntaxError || error instanceof URIError)
    return apiError(req, "请求格式无效", "Invalid request format", 400);
  if (
    req.signal.aborted ||
    (error instanceof Error && error.name === "AbortError")
  )
    return apiError(req, "上传已取消", "Upload cancelled", 499);
  console.error(
    "Local material operation failed:",
    error instanceof Error ? error.name : "unknown",
  );
  return apiError(
    req,
    "素材操作失败，请重试",
    "Material operation failed; please retry",
    500,
  );
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const invalid = await checkProject(req, id);
    if (invalid) return invalid;
    return NextResponse.json({
      materials: (await listLocalMaterials(materialsDir(id))).map((item) =>
        publicItem(id, item),
      ),
    });
  } catch (error) {
    return failure(req, error);
  }
}

/** Raw files stream to disk. Legacy multipart remains bounded and reports per-file outcomes. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const invalid = await checkProject(req, id);
    if (invalid) return invalid;
    if (!req.body)
      return apiError(req, "请选择素材文件", "Choose a material file", 400);
    const declared = req.headers.get("content-length");
    const expectedBytes = declared === null ? undefined : Number(declared);
    if (
      expectedBytes !== undefined &&
      (!Number.isSafeInteger(expectedBytes) ||
        expectedBytes > MATERIAL_MAX_BYTES + 64 * 1024)
    )
      throw new Error("MATERIAL_SIZE");
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      let received = 0;
      const bounded = req.body.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            received += chunk.byteLength;
            if (received > MATERIAL_MAX_BYTES + 64 * 1024)
              throw new Error("MATERIAL_SIZE");
            controller.enqueue(chunk);
          },
        }),
      );
      const form = await new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: bounded,
        duplex: "half",
        signal: req.signal,
      } as RequestInit).formData();
      const entries = form.getAll("files");
      if (
        !entries.length ||
        entries.length > 12 ||
        entries.some((file) => typeof file === "string")
      )
        return apiError(
          req,
          "每次请选择 1–12 个素材文件",
          "Choose 1–12 material files",
          400,
        );
      const files = entries as File[];
      if (files.some((file) => !classifyMaterial(file.name)))
        throw new Error("UNSUPPORTED_MATERIAL");
      if (
        files.some((file) => !file.size || file.size > MATERIAL_MAX_BYTES) ||
        files.reduce((sum, file) => sum + file.size, 0) > MATERIAL_MAX_BYTES
      )
        throw new Error("MATERIAL_SIZE");
      const saved = [],
        errors = [];
      for (const file of files) {
        try {
          const result = await storeLocalMaterial(
            materialsDir(id),
            file.name,
            file.stream(),
            { signal: req.signal, expectedBytes: file.size },
          );
          saved.push({
            ...publicItem(id, result.material),
            duplicate: result.duplicate,
          });
        } catch (error) {
          const response = failure(req, error);
          errors.push({ name: file.name, ...(await response.json()) });
        }
      }
      return NextResponse.json(
        { materials: saved, errors },
        { status: errors.length ? 207 : 201 },
      );
    }
    const name = decodeURIComponent(req.headers.get("x-file-name") ?? "");
    const result = await storeLocalMaterial(materialsDir(id), name, req.body, {
      signal: req.signal,
      expectedBytes,
    });
    return NextResponse.json(
      {
        materials: [publicItem(id, result.material)],
        duplicate: result.duplicate,
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    return failure(req, error);
  }
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const invalid = await checkProject(req, id);
    if (invalid) return invalid;
    const body = await req.json();
    if (
      !body ||
      typeof body.name !== "string" ||
      typeof body.originalName !== "string"
    )
      throw new Error("INVALID_NAME");
    const result = await updateMaterialMetadata(
      materialsDir(id),
      body.name,
      body.originalName,
      body.tags,
    );
    return NextResponse.json(publicItem(id, result));
  } catch (error) {
    return failure(req, error);
  }
}
