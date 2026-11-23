import {
  classifyMaterial,
  MATERIAL_MAX_BYTES,
  type PublicLocalMaterial,
} from "@/lib/material-library";
export interface MaterialUploadProgress {
  percent: number;
  verifying: boolean;
}

/** Send the File directly so the browser never creates a full-file ArrayBuffer. */
export function uploadLocalMaterial(
  projectId: string,
  file: File,
  options: {
    locale: "zh" | "en";
    signal?: AbortSignal;
    onProgress?: (progress: MaterialUploadProgress) => void;
  },
): Promise<{ material: PublicLocalMaterial; duplicate: boolean }> {
  const en = options.locale === "en";
  if (!classifyMaterial(file.name))
    return Promise.reject(
      new Error(en ? "Unsupported file type" : "不支持的素材类型"),
    );
  if (!file.size || file.size > MATERIAL_MAX_BYTES)
    return Promise.reject(
      new Error(
        en
          ? "Choose a nonempty file up to 80 MB"
          : "请选择非空且不超过 80MB 的素材",
      ),
    );
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cancelled = () => new DOMException("Upload cancelled", "AbortError");
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      callback();
    };
    const abort = () => {
      xhr.abort();
      finish(() => reject(cancelled()));
    };
    if (options.signal?.aborted) return reject(cancelled());
    xhr.open("POST", `/api/project/${encodeURIComponent(projectId)}/materials`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.setRequestHeader("Accept-Language", options.locale);
    xhr.timeout = 300_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        options.onProgress?.({
          percent: Math.round((event.loaded / event.total) * 100),
          verifying: event.loaded >= event.total,
        });
    };
    xhr.onload = () =>
      finish(() => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status < 200 || xhr.status >= 300 || !data.materials?.[0])
            throw new Error(data.error || (en ? "Upload failed" : "上传失败"));
          resolve({
            material: data.materials[0],
            duplicate: data.duplicate === true,
          });
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error(en ? "Upload failed" : "上传失败"),
          );
        }
      });
    xhr.onerror = () =>
      finish(() =>
        reject(
          new Error(
            en
              ? "Connection interrupted; retry the upload"
              : "连接中断，可重试上传",
          ),
        ),
      );
    xhr.ontimeout = () =>
      finish(() =>
        reject(
          new Error(en ? "Upload timed out; please retry" : "上传超时，请重试"),
        ),
      );
    xhr.onabort = () => finish(() => reject(cancelled()));
    options.signal?.addEventListener("abort", abort, { once: true });
    xhr.send(file);
  });
}
