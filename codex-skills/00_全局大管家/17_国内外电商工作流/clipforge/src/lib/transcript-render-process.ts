import { spawn } from "child_process";
import { ffmpegBin } from "@/lib/ffmpeg-path";

/** Resolve only after the child closes, so cancelled attempts cannot keep writing output. */
export function runTranscriptFfmpeg(args: string[], options: {
  duration: number; timeoutMs: number; signal?: AbortSignal; onProgress?: (value: number) => void; timeoutMessage?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(options.signal.reason); return; }
    const child = spawn(ffmpegBin(), ["-progress", "pipe:1", "-nostats", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let pending = "";
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      child.kill("SIGTERM");
      killTimer ??= setTimeout(() => child.kill("SIGKILL"), 5_000);
      killTimer.unref();
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, options.timeoutMs);
    timer.unref();
    options.signal?.addEventListener("abort", stop, { once: true });
    const clean = () => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      options.signal?.removeEventListener("abort", stop);
    };
    child.stderr.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-8192); });
    child.stdout.on("data", (chunk) => {
      pending += String(chunk);
      const lines = pending.split(/\r?\n/);
      pending = (lines.pop() ?? "").slice(-1024);
      for (const line of lines) {
        const match = /^out_time_us=(\d+)$/.exec(line);
        if (match) options.onProgress?.(Math.min(99, Math.max(1, Math.round(Number(match[1]) / 1e6 / options.duration * 100))));
      }
    });
    child.once("error", (error) => { clean(); reject(error); });
    child.once("close", (code) => {
      clean();
      if (options.signal?.aborted) reject(options.signal.reason);
      else if (timedOut) reject(new Error(options.timeoutMessage ?? "文字剪辑超时，请缩短素材后重试"));
      else if (code !== 0) reject(new Error(/no space left|ENOSPC/i.test(stderr) ? "磁盘空间不足，无法输出剪辑版本" : `FFmpeg render failed (${code}): ${stderr.slice(-1500)}`));
      else resolve();
    });
  });
}
