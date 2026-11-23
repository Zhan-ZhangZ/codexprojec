#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { characterErrorRate, timestampQuality } from "./lib/asr-metrics.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => args[args.indexOf(name) + 1] && args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
if (args.includes("--help") || !args.includes("--manifest")) {
  console.log("Usage: node scripts/benchmark-local-asr.mjs --manifest samples.json --model tiny|base|small --output report.json [--cache /path] [--allow-download]\nManifest: [{id, audio: localPath, reference, language: zh|en}]. Local CPU q8; no media upload. Model downloads require --allow-download. Run one model per process for separate memory measurements.");
  process.exit(args.includes("--help") ? 0 : 1);
}
const size = option("--model", "tiny");
if (!["tiny", "base", "small"].includes(size)) throw new Error("Model must be tiny, base, or small");
const manifestPath = resolve(option("--manifest"));
const samples = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(samples) || !samples.length || samples.length > 50 || samples.some((sample) => !sample.id || typeof sample.audio !== "string" || !sample.reference?.trim() || !["zh", "en"].includes(sample.language))) throw new Error("Invalid evaluation manifest");
const { pipeline, env } = await import("@huggingface/transformers");
env.cacheDir = resolve(option("--cache", "/tmp/clipforge-asr-model-cache"));
env.allowLocalModels = false;
env.allowRemoteModels = true;
const started = performance.now();
const transcriber = await pipeline("automatic-speech-recognition", `onnx-community/whisper-${size}_timestamped`, { device: "cpu", dtype: "q8", local_files_only: !args.includes("--allow-download") });
const loadMs = Math.round(performance.now() - started);
const results = [];
try {
  for (const sample of samples) {
    const { stdout } = await promisify(execFile)(process.env.FFMPEG_PATH || "ffmpeg", ["-nostdin", "-v", "error", "-i", resolve(dirname(manifestPath), sample.audio), "-t", "120", "-vn", "-ar", "16000", "-ac", "1", "-f", "f32le", "pipe:1"], { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 });
    const audio = new Float32Array(stdout.length / 4);
    for (let i = 0; i < audio.length; i++) audio[i] = stdout.readFloatLE(i * 4);
    if (!audio.length || audio.length >= 120 * 16000) throw new Error("Evaluation samples must be shorter than 120 seconds");
    const start = performance.now();
    const output = await transcriber(audio, { language: sample.language, task: "transcribe", return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
    const inferenceMs = Math.round(performance.now() - start);
    const duration = audio.length / 16000;
    results.push({ id: sample.id, duration, reference: sample.reference, text: output.text, inferenceMs, realTimeFactor: inferenceMs / 1000 / duration, ...characterErrorRate(sample.reference, output.text), timestamps: timestampQuality(output.chunks, duration) });
    console.log(`${sample.id}: CER=${results.at(-1).cer.toFixed(3)}, RTF=${results.at(-1).realTimeFactor.toFixed(2)}`);
  }
} finally { await transcriber.dispose(); }
const errors = results.reduce((sum, row) => sum + row.errors, 0);
const characters = results.reduce((sum, row) => sum + row.characters, 0);
const report = { format: "clipforge-asr-evaluation@1", model: `onnx-community/whisper-${size}_timestamped`, runtime: "node-cpu", dtype: "q8", platform: process.platform, arch: process.arch, loadMs, peakRssMb: process.resourceUsage().maxRSS / 1024, createdAt: new Date().toISOString(), cer: errors / characters, normalization: "NFKC; lowercase; punctuation, symbols and whitespace removed; numbers and scripts unchanged", limitation: "Local evaluation samples only. CPU timings do not predict browser WASM/WebGPU performance.", results };
await writeFile(resolve(option("--output", `asr-${size}-report.json`)), JSON.stringify(report, null, 2) + "\n");
