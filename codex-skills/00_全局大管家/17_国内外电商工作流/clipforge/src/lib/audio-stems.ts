import { mkdir } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { ffmpegBin } from "@/lib/ffmpeg-path";

const execFileAsync = promisify(execFile);
const FADE_DURATION = 0.5;

export interface AudioStemClip {
  duration: number;
  transition: string;
  audioPath?: string;
}

export interface RenderAudioStemsInput {
  clips: AudioStemClip[];
  bgmPath?: string;
  bgmVolume?: number;
  totalDuration: number;
  outputDir: string;
}

export interface RenderAudioStemsResult {
  voicePath?: string;
  bgmPath?: string;
}

function audioClipFilter(label: string, duration: number): string {
  return `[${label}:a]aresample=44100,apad,atrim=duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS`;
}

function buildVoiceArgs(clips: AudioStemClip[], outputPath: string): string[] | null {
  if (!clips.some((clip) => clip.audioPath)) return null;
  const args = ["-y"];
  const filters: string[] = [];
  let inputIndex = 0;
  clips.forEach((clip, index) => {
    if (clip.audioPath) args.push("-i", clip.audioPath);
    else args.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo");
    const base = clip.audioPath ? audioClipFilter(String(inputIndex), clip.duration) : `[${inputIndex}:a]atrim=duration=${clip.duration.toFixed(3)},asetpts=PTS-STARTPTS`;
    filters.push(`${base}[v${index}]`);
    inputIndex += 1;
  });
  let current = "v0";
  for (let i = 1; i < clips.length; i += 1) {
    const next = `mix${i}`;
    const fadeDuration = Math.min(FADE_DURATION, clips[i - 1].duration, clips[i].duration);
    if (clips[i].transition === "ffmpeg_fade" && fadeDuration > 0.01) {
      filters.push(`[${current}][v${i}]acrossfade=d=${fadeDuration.toFixed(3)}[${next}]`);
    } else {
      filters.push(`[${current}][v${i}]concat=n=2:v=0:a=1[${next}]`);
    }
    current = next;
  }
  args.push("-filter_complex", filters.join(";"), "-map", `[${current}]`, "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", outputPath);
  return args;
}

function buildBgmArgs(input: RenderAudioStemsInput, outputPath: string): string[] | null {
  if (!input.bgmPath || input.totalDuration <= 0) return null;
  const volume = Math.min(0.4, Math.max(0.05, input.bgmVolume ?? 0.18));
  const fadeStart = Math.max(0, input.totalDuration - 3);
  return [
    "-y", "-stream_loop", "-1", "-i", input.bgmPath,
    "-t", input.totalDuration.toFixed(3),
    "-af", `aresample=44100,volume=${volume},afade=t=out:st=${fadeStart.toFixed(3)}:d=3`,
    "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", outputPath,
  ];
}

/** Render optional, editable audio stems without exposing absolute source paths. */
export async function renderAudioStems(input: RenderAudioStemsInput): Promise<RenderAudioStemsResult> {
  await mkdir(input.outputDir, { recursive: true });
  const result: RenderAudioStemsResult = {};
  const voicePath = join(input.outputDir, "voice.wav");
  const voiceArgs = buildVoiceArgs(input.clips, voicePath);
  if (voiceArgs) {
    await execFileAsync(ffmpegBin(), voiceArgs, { maxBuffer: 10 * 1024 * 1024 });
    result.voicePath = voicePath;
  }
  const bgmPath = join(input.outputDir, "bgm.wav");
  const bgmArgs = buildBgmArgs(input, bgmPath);
  if (bgmArgs) {
    await execFileAsync(ffmpegBin(), bgmArgs, { maxBuffer: 10 * 1024 * 1024 });
    result.bgmPath = bgmPath;
  }
  return result;
}
