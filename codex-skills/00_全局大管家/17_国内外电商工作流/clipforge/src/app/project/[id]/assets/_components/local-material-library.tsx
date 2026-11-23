"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuChevronDown,
  LuFileImage,
  LuFileVideo,
  LuLoaderCircle,
  LuUpload,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import {
  MATERIAL_ACCEPT,
  materialTags,
  type PublicLocalMaterial,
} from "@/lib/material-library";
import { uploadLocalMaterial } from "@/lib/upload-local-material";

interface ShotOption {
  shotId: number;
  description: string;
}
interface UploadRow {
  file: File;
  state:
    | "waiting"
    | "uploading"
    | "verifying"
    | "done"
    | "duplicate"
    | "cancelled"
    | "failed";
  percent: number;
  error?: string;
}
const field =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary";
const PAGE_SIZE = 12;
export function LocalMaterialLibrary({
  projectId,
  shots,
  busy,
  canFill,
  refreshKey,
  onUse,
  onFill,
}: {
  projectId: string;
  shots: ShotOption[];
  busy: boolean;
  canFill: boolean;
  refreshKey: number;
  onUse: (material: PublicLocalMaterial, shotId: number) => Promise<void>;
  onFill: () => Promise<void>;
}) {
  const t = useT("materials"),
    locale = useLocale();
  const input = useRef<HTMLInputElement>(null),
    uploadAbort = useRef<AbortController | null>(null);
  const alive = useRef(true),
    request = useRef({ serial: 0 });
  const [items, setItems] = useState<PublicLocalMaterial[]>([]);
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(0);
  const [uploads, setUploads] = useState<UploadRow[]>([]),
    [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null),
    [draftName, setDraftName] = useState(""),
    [draftTags, setDraftTags] = useState("");
  const [saving, setSaving] = useState(false),
    [preview, setPreview] = useState<string | null>(null),
    [targetShot, setTargetShot] = useState("");
  const [using, setUsing] = useState<string | null>(null),
    [filling, setFilling] = useState(false);
  const reload = useCallback(async () => {
    const serial = ++request.current.serial;
    try {
      const res = await fetch(`/api/project/${projectId}/materials`, {
        headers: { "Accept-Language": locale },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedLoad"));
      if (alive.current && serial === request.current.serial) {
        setItems(data.materials);
        setLoadError("");
      }
    } catch (err) {
      if (alive.current && serial === request.current.serial)
        setLoadError(err instanceof Error ? err.message : t("failedLoad"));
    } finally {
      if (alive.current && serial === request.current.serial) setLoading(false);
    }
  }, [projectId, locale, t]);
  useEffect(() => {
    const guard = request.current;
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
      guard.serial++;
      uploadAbort.current?.abort();
    };
  }, [reload, refreshKey]);
  const filtered = useMemo(
    () =>
      items
        .filter(
          (item) =>
            (type === "all" || item.mediaType === type) &&
            `${item.originalName} ${item.tags.join(" ")}`
              .normalize("NFKC")
              .toLowerCase()
              .includes(query.trim().normalize("NFKC").toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.originalName.localeCompare(b.originalName, locale)
            : b.updatedAt - a.updatedAt,
        ),
    [items, type, query, sort, locale],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const editBusy = busy || uploading || filling || using !== null;
  const upsert = (item: PublicLocalMaterial) =>
    setItems((current) => [
      item,
      ...current.filter((value) => value.name !== item.name),
    ]);

  async function uploadFiles(files: File[]) {
    if (uploadAbort.current) return;
    if (files.length > 12) {
      setError(t("tooMany"));
      return;
    }
    if (!files.length) return;
    const controller = new AbortController();
    uploadAbort.current = controller;
    setUploading(true);
    setError("");
    setMessage("");
    setUploads(files.map((file) => ({ file, state: "waiting", percent: 0 })));
    const update = (index: number, patch: Partial<UploadRow>) => {
      if (alive.current)
        setUploads((rows) =>
          rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
        );
    };
    try {
      for (let index = 0; index < files.length; index++) {
        if (controller.signal.aborted) {
          update(index, { state: "cancelled" });
          continue;
        }
        update(index, { state: "uploading" });
        try {
          const result = await uploadLocalMaterial(projectId, files[index], {
            locale,
            signal: controller.signal,
            onProgress: ({ percent, verifying }) =>
              update(index, {
                percent,
                state: verifying ? "verifying" : "uploading",
              }),
          });
          if (alive.current) upsert(result.material);
          update(index, {
            state: result.duplicate ? "duplicate" : "done",
            percent: 100,
          });
        } catch (err) {
          update(index, {
            state: controller.signal.aborted ? "cancelled" : "failed",
            error: controller.signal.aborted
              ? undefined
              : err instanceof Error
                ? err.message
                : t("failed"),
          });
        }
      }
    } finally {
      uploadAbort.current = null;
      if (alive.current) {
        setUploading(false);
        await reload();
      }
    }
  }
  async function save(item: PublicLocalMaterial) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const tags = materialTags(
        draftTags
          .split(/[,，、\n]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      );
      const res = await fetch(`/api/project/${projectId}/materials`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          name: item.name,
          originalName: draftName,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedSave"));
      if (alive.current) {
        upsert(data);
        setEditing(null);
        setMessage(t("saved"));
      }
    } catch (err) {
      if (alive.current)
        setError(
          err instanceof Error && err.message !== "INVALID_TAGS"
            ? err.message
            : t("tagsHint"),
        );
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  async function applyMaterial(item: PublicLocalMaterial) {
    const shot = shots.find(
      (candidate) => String(candidate.shotId) === targetShot,
    );
    if (!shot || editBusy) return;
    setUsing(item.name);
    setError("");
    setMessage("");
    try {
      await onUse(item, shot.shotId);
      if (alive.current) setMessage(t("used", { id: shot.shotId }));
    } catch (err) {
      if (alive.current)
        setError(err instanceof Error ? err.message : t("failedSave"));
    } finally {
      if (alive.current) setUsing(null);
    }
  }
  return (
    <details
      className="mb-6 rounded-xl border border-border bg-card/50"
      data-testid="local-material-library"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-primary">
        <LuFileVideo
          className="size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 font-medium">{t("title")}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
        <LuChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            <LuUpload className="mr-2 size-4" aria-hidden="true" />
            {t("upload")}
          </Button>
          {uploading && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => uploadAbort.current?.abort()}
            >
              {t("cancel")}
            </Button>
          )}
          <Button
            variant="outline"
            className="min-h-11"
            disabled={editBusy || !canFill || !items.length}
            onClick={async () => {
              setFilling(true);
              setError("");
              try {
                await onFill();
              } catch (err) {
                if (alive.current)
                  setError(
                    err instanceof Error ? err.message : t("failedSave"),
                  );
              } finally {
                if (alive.current) setFilling(false);
              }
            }}
          >
            {filling ? t("filling") : t("fill")}
          </Button>
          <input
            ref={input}
            type="file"
            accept={MATERIAL_ACCEPT}
            multiple
            className="hidden"
            aria-label={t("upload")}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void uploadFiles(files);
            }}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("limit")}
        </p>
        {uploads.length > 0 && (
          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
            {uploads.map((row, index) => (
              <div key={index} className="space-y-1 text-xs">
                <div className="flex flex-wrap justify-between gap-1">
                  <span className="min-w-0 break-all">{row.file.name}</span>
                  <span>
                    {row.error || t(row.state, { percent: row.percent })}
                  </span>
                </div>
                {(row.state === "uploading" || row.state === "verifying") && (
                  <progress
                    className="h-1.5 w-full accent-primary"
                    aria-label={row.file.name}
                    value={row.percent}
                    max={100}
                  />
                )}
              </div>
            ))}
            {!uploading && (
              <div className="flex flex-wrap gap-2">
                {uploads.some(
                  (row) => row.state === "failed" || row.state === "cancelled",
                ) && (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      void uploadFiles(
                        uploads
                          .filter(
                            (row) =>
                              row.state === "failed" ||
                              row.state === "cancelled",
                          )
                          .map((row) => row.file),
                      )
                    }
                  >
                    {t("retryFailed")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => setUploads([])}
                >
                  {t("discard")}
                </Button>
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="break-words text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LuLoaderCircle
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            {t("verifying")}
          </p>
        ) : loadError ? (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => void reload()}
            >
              {t("retry")}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                className={field}
                type="search"
                aria-label={t("search")}
                placeholder={t("search")}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
              <select
                className={field}
                aria-label={t("type")}
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">{t("all")}</option>
                <option value="video">{t("video")}</option>
                <option value="image">{t("image")}</option>
              </select>
              <select
                className={field}
                aria-label={t("sort")}
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(0);
                }}
              >
                <option value="newest">{t("newest")}</option>
                <option value="name">{t("name")}</option>
              </select>
            </div>
            {shots.length ? (
              <label className="block space-y-1 text-xs text-muted-foreground">
                {t("chooseShot")}
                <select
                  className={`${field} block w-full`}
                  value={targetShot}
                  onChange={(event) => setTargetShot(event.target.value)}
                >
                  <option value="">{t("chooseShot")}</option>
                  {shots.map((shot) => (
                    <option key={shot.shotId} value={shot.shotId}>
                      {t("shot", { id: shot.shotId })} ·{" "}
                      {shot.description.slice(0, 70)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noShots")}</p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("usageHint")}
            </p>
            {!visible.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {items.length ? t("noMatch") : t("empty")}
              </p>
            )}
            <div className="space-y-2">
              {visible.map((item) => (
                <article
                  key={item.name}
                  className="min-w-0 rounded-lg border border-border p-3"
                  data-material-name={item.name}
                >
                  <div className="flex items-start gap-3">
                    {item.mediaType === "video" ? (
                      <LuFileVideo
                        className="mt-1 size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <LuFileImage
                        className="mt-1 size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium">
                        {item.originalName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(item.mediaType)} ·{" "}
                        {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB
                        {item.width && item.height
                          ? ` · ${item.width} × ${item.height}`
                          : ""}
                        {item.durationSec
                          ? ` · ${item.durationSec.toFixed(1)} s`
                          : ""}
                      </p>
                      {!!item.tags.length && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {item.tags.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onClick={() =>
                        setPreview(preview === item.name ? null : item.name)
                      }
                      aria-expanded={preview === item.name}
                    >
                      {preview === item.name
                        ? t("closePreview")
                        : t("preview", { name: "" })}
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      disabled={saving}
                      onClick={() => {
                        setEditing(editing === item.name ? null : item.name);
                        setDraftName(item.originalName);
                        setDraftTags(item.tags.join(", "));
                        setError("");
                      }}
                    >
                      {t("edit")}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={
                        editBusy ||
                        !shots.some(
                          (shot) => String(shot.shotId) === targetShot,
                        )
                      }
                      onClick={() => void applyMaterial(item)}
                    >
                      {using === item.name ? t("using") : t("use")}
                    </Button>
                  </div>
                  {preview === item.name &&
                    (item.mediaType === "video" ? (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={item.url}
                        aria-label={t("preview", { name: item.originalName })}
                        className="mt-3 max-h-72 w-full rounded-md bg-black"
                      />
                    ) : (
                      <Image
                        unoptimized
                        width={item.width || 320}
                        height={item.height || 180}
                        src={item.url}
                        alt={item.originalName}
                        className="mt-3 max-h-72 w-full rounded-md object-contain"
                      />
                    ))}
                  {editing === item.name && (
                    <form
                      className="mt-3 space-y-3 border-t border-border pt-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void save(item);
                      }}
                    >
                      <label className="block space-y-1 text-xs">
                        {t("displayName")}
                        <input
                          className={`${field} block w-full`}
                          value={draftName}
                          maxLength={240}
                          required
                          onChange={(event) => setDraftName(event.target.value)}
                        />
                      </label>
                      <label className="block space-y-1 text-xs">
                        {t("tags")}
                        <input
                          className={`${field} block w-full`}
                          value={draftTags}
                          onChange={(event) => setDraftTags(event.target.value)}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {t("tagsHint")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="min-h-11"
                          disabled={saving}
                        >
                          {saving ? t("saving") : t("save")}
                        </Button>
                        <Button
                          type="button"
                          className="min-h-11"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => setEditing(null)}
                        >
                          {t("discard")}
                        </Button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {t("count", { count: filtered.length })} ·{" "}
                {t("page", { page: currentPage + 1, pages })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={currentPage + 1 >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
