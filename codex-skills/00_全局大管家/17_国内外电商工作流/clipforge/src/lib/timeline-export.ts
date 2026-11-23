import { basename } from "path";
import { normalizeTimeRanges, outputDuration, type TimeRange } from "@/lib/transcript-editor";

export type TimelineExportFormat = "otio" | "edl" | "csv";

export interface TimelineExportInput {
  projectName: string;
  sourceName: string;
  sourceDuration: number;
  frameRate: number;
  hasAudio: boolean;
  keepRanges: TimeRange[];
  clipNotes?: string[];
  /** Optional record-time caption cues exported as a dedicated editable text track. */
  captionCues?: TimelineCaptionCue[];
  /** Optional record-time rhythm markers (for example transcript sentence starts). */
  beatMarkers?: TimelineBeatMarker[];
  revision?: number | null;
}

export interface TimelineBeatMarker {
  /** Position on the exported record timeline, in seconds. */
  time: number;
  /** Optional source position, retained for relinking/debugging. */
  sourceTime?: number;
  /** Short human-readable marker label. */
  label?: string;
}

export interface TimelineCaptionCue {
  /** Position on the exported record timeline, in seconds. */
  time: number;
  /** End position on the exported record timeline, in seconds. */
  endTime: number;
  /** Caption text shown by the NLE text generator. */
  text: string;
}

export interface TimelineExportResult {
  content: string;
  fileName: string;
  mimeType: string;
  clips: number;
  duration: number;
  frameRate: number;
}

function safeStem(value: string, stripExtension = false): string {
  const base = basename(value);
  return ((stripExtension ? base.replace(/\.[^.]+$/, "") : base).replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "clipforge-edit");
}

function safeSourceName(value: string): string {
  return basename(value.replace(/\\/g, "/")).slice(0, 240) || "source.mp4";
}

function frameValue(seconds: number, rate: number): number {
  return Math.max(0, Math.round(seconds * rate));
}

function rationalTime(seconds: number, rate: number) {
  return { OTIO_SCHEMA: "RationalTime.1", rate, value: frameValue(seconds, rate) };
}

function timeRange(start: number, duration: number, rate: number) {
  return {
    OTIO_SCHEMA: "TimeRange.1",
    duration: rationalTime(duration, rate),
    start_time: rationalTime(start, rate),
  };
}

function normalizedBeatMarkers(input: TimelineExportInput, duration: number): TimelineBeatMarker[] {
  const seen = new Set<string>();
  return (input.beatMarkers ?? [])
    .map((marker) => ({
      time: Math.min(Math.max(Number(marker.time), 0), duration),
      ...(Number.isFinite(marker.sourceTime) ? { sourceTime: Math.max(0, Number(marker.sourceTime)) } : {}),
      ...(typeof marker.label === "string" && marker.label.trim() ? { label: marker.label.replace(/[\r\n]+/g, " ").trim().slice(0, 160) } : {}),
    }))
    .filter((marker) => Number.isFinite(marker.time))
    .sort((a, b) => a.time - b.time)
    .filter((marker) => {
      const key = `${marker.time.toFixed(3)}|${marker.label ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizedCaptionCues(input: TimelineExportInput, duration: number): TimelineCaptionCue[] {
  return (input.captionCues ?? [])
    .map((cue) => ({
      time: Math.min(Math.max(Number(cue.time), 0), duration),
      endTime: Math.min(Math.max(Number(cue.endTime), 0), duration),
      text: typeof cue.text === "string" ? cue.text.replace(/[\r\n]+/g, " ").trim().slice(0, 2_000) : "",
    }))
    .filter((cue) => Number.isFinite(cue.time) && Number.isFinite(cue.endTime) && cue.endTime - cue.time >= 0.01 && cue.text)
    .sort((a, b) => a.time - b.time || a.endTime - b.endTime)
    .filter((cue, index, all) => index === 0 || cue.time >= all[index - 1].endTime - 0.01);
}

function otioMarker(marker: TimelineBeatMarker, rate: number) {
  return {
    OTIO_SCHEMA: "Marker.1",
    color: "YELLOW",
    name: marker.label || "Beat",
    marked_range: timeRange(marker.time, 0, rate),
    metadata: { clipforge: { kind: "beat", ...(marker.sourceTime != null && { sourceTimeSeconds: marker.sourceTime }) } },
  };
}

function externalReference(sourceName: string, sourceDuration: number, rate: number) {
  return {
    OTIO_SCHEMA: "ExternalReference.1",
    available_range: timeRange(0, sourceDuration, rate),
    metadata: { clipforge: { pathMode: "relative", relinkBy: "file-name" } },
    target_url: encodeURI(sourceName),
    name: sourceName,
  };
}

function otioClip(range: TimeRange, index: number, input: TimelineExportInput, rate: number) {
  return {
    OTIO_SCHEMA: "Clip.1",
    effects: [],
    markers: [],
    enabled: true,
    media_reference: externalReference(safeSourceName(input.sourceName), input.sourceDuration, rate),
    metadata: {
      clipforge: {
        sourceStartSeconds: range.start,
        sourceEndSeconds: range.end,
        revision: input.revision ?? null,
        transcript: input.clipNotes?.[index] ?? "",
      },
    },
    name: `Cut ${String(index + 1).padStart(3, "0")}`,
    source_range: timeRange(range.start, range.end - range.start, rate),
  };
}

function otioTrack(kind: "Video" | "Audio", ranges: TimeRange[], input: TimelineExportInput, rate: number) {
  return {
    OTIO_SCHEMA: "Track.1",
    children: ranges.map((range, index) => otioClip(range, index, input, rate)),
    effects: [],
    kind,
    markers: [],
    enabled: true,
    metadata: {},
    name: kind === "Video" ? "V1 · Source cuts" : "A1 · Source audio",
    source_range: null,
  };
}

function otioCaptionTrack(cues: TimelineCaptionCue[], rate: number) {
  const children: unknown[] = [];
  let cursor = 0;
  cues.forEach((cue, index) => {
    if (cue.time > cursor + 0.001) {
      children.push({
        OTIO_SCHEMA: "Gap.1",
        source_range: timeRange(0, cue.time - cursor, rate),
        name: "Caption gap",
      });
    }
    const duration = cue.endTime - cue.time;
    children.push({
      OTIO_SCHEMA: "Clip.1",
      enabled: true,
      effects: [],
      markers: [],
      media_reference: {
        OTIO_SCHEMA: "GeneratorReference.1",
        generator_kind: "Text",
        parameters: { text: cue.text },
      },
      metadata: { clipforge: { role: "caption", sourceTime: cue.time, sourceEndTime: cue.endTime } },
      name: `Caption ${String(index + 1).padStart(3, "0")}`,
      source_range: timeRange(0, duration, rate),
    });
    cursor = cue.endTime;
  });
  return {
    OTIO_SCHEMA: "Track.1",
    children,
    effects: [],
    kind: "Video",
    markers: [],
    enabled: true,
    metadata: { clipforge: { role: "captions", editable: true } },
    name: "C1 · Captions",
    source_range: null,
  };
}

export function buildOtioTimeline(input: TimelineExportInput): string {
  const rate = normalizedFrameRate(input.frameRate);
  const ranges = normalizeTimeRanges(input.keepRanges, input.sourceDuration);
  const duration = outputDuration(ranges);
  const beatMarkers = normalizedBeatMarkers(input, duration);
  const captionCues = normalizedCaptionCues(input, duration);
  const tracks: unknown[] = [otioTrack("Video", ranges, input, rate)];
  if (input.hasAudio) tracks.push(otioTrack("Audio", ranges, input, rate));
  if (captionCues.length) tracks.push(otioCaptionTrack(captionCues, rate));
  return JSON.stringify({
    OTIO_SCHEMA: "Timeline.1",
    metadata: {
      clipforge: {
        exportedAt: new Date().toISOString(),
        pathMode: "relative",
        sourceName: safeSourceName(input.sourceName),
        revision: input.revision ?? null,
        beatMarkers: beatMarkers.map((marker) => ({ ...marker })),
        captionCues: captionCues.map((cue) => ({ ...cue })),
      },
    },
    name: input.projectName || "ClipForge edit",
    markers: beatMarkers.map((marker) => otioMarker(marker, rate)),
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      children: tracks,
      effects: [],
      markers: [],
      enabled: true,
      metadata: {},
      name: "tracks",
      source_range: null,
    },
  }, null, 2);
}

export function normalizedFrameRate(value: number): number {
  if (!Number.isFinite(value) || value < 1 || value > 240) return 30;
  return Number(value.toFixed(6));
}

export function framesToTimecode(totalFrames: number, frameRate: number): string {
  const base = Math.max(1, Math.round(normalizedFrameRate(frameRate)));
  let remaining = Math.max(0, Math.round(totalFrames));
  const hours = Math.floor(remaining / (base * 3600));
  remaining %= base * 3600;
  const minutes = Math.floor(remaining / (base * 60));
  remaining %= base * 60;
  const seconds = Math.floor(remaining / base);
  const frames = remaining % base;
  return [hours, minutes, seconds, frames].map((part) => String(part).padStart(2, "0")).join(":");
}

export function secondsToTimecode(seconds: number, frameRate: number): string {
  return framesToTimecode(frameValue(seconds, normalizedFrameRate(frameRate)), frameRate);
}

export function buildCmx3600Edl(input: TimelineExportInput): string {
  const rate = normalizedFrameRate(input.frameRate);
  const ranges = normalizeTimeRanges(input.keepRanges, input.sourceDuration);
  const captionCues = normalizedCaptionCues(input, outputDuration(ranges));
  let recordCursor = 0;
  const lines = [`TITLE: ${input.projectName || "CLIPFORGE EDIT"}`, "FCM: NON-DROP FRAME", ""];
  ranges.forEach((range, index) => {
    const length = range.end - range.start;
    const event = String(index + 1).padStart(3, "0");
    const channel = input.hasAudio ? "AA/V" : "V";
    lines.push(`${event}  AX       ${channel.padEnd(4)} C        ${secondsToTimecode(range.start, rate)} ${secondsToTimecode(range.end, rate)} ${secondsToTimecode(recordCursor, rate)} ${secondsToTimecode(recordCursor + length, rate)}`);
    lines.push(`* FROM CLIP NAME: ${safeSourceName(input.sourceName)}`);
    if (input.clipNotes?.[index]) lines.push(`* TRANSCRIPT: ${input.clipNotes[index].replace(/[\r\n]+/g, " ")}`);
    const captions = captionCues.filter((cue) => cue.time >= recordCursor - 0.001 && cue.time <= recordCursor + length + 0.001);
    for (const cue of captions) lines.push(`* CAPTION ${secondsToTimecode(cue.time, rate)}-${secondsToTimecode(cue.endTime, rate)} · ${cue.text}`);
    lines.push(`* CLIPFORGE SOURCE: ${range.start.toFixed(3)} - ${range.end.toFixed(3)} seconds`, "");
    recordCursor += length;
  });
  const beatMarkers = normalizedBeatMarkers(input, recordCursor);
  if (beatMarkers.length) {
    lines.push("* CLIPFORGE RHYTHM MARKERS");
    for (const marker of beatMarkers) {
      lines.push(`* BEAT ${secondsToTimecode(marker.time, rate)}${marker.label ? ` · ${marker.label}` : ""}`);
    }
  }
  return lines.join("\n");
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildTimelineCsv(input: TimelineExportInput): string {
  const rate = normalizedFrameRate(input.frameRate);
  const ranges = normalizeTimeRanges(input.keepRanges, input.sourceDuration);
  let recordCursor = 0;
  const beatMarkers = normalizedBeatMarkers(input, outputDuration(ranges));
  const captionCues = normalizedCaptionCues(input, outputDuration(ranges));
  const rows: Array<Array<string | number>> = [["Event", "Source", "Source In", "Source Out", "Record In", "Record Out", "Duration Seconds", "Source In Seconds", "Source Out Seconds", "Transcript", "Rhythm Markers", "Caption Cues"]];
  ranges.forEach((range, index) => {
    const length = range.end - range.start;
    rows.push([
      index + 1,
      safeSourceName(input.sourceName),
      secondsToTimecode(range.start, rate),
      secondsToTimecode(range.end, rate),
      secondsToTimecode(recordCursor, rate),
      secondsToTimecode(recordCursor + length, rate),
      length.toFixed(3),
      range.start.toFixed(3),
      range.end.toFixed(3),
      input.clipNotes?.[index] ?? "",
      beatMarkers
        .filter((marker) => marker.time >= recordCursor - 0.001 && marker.time <= recordCursor + length + 0.001)
        .map((marker) => `${secondsToTimecode(marker.time, rate)}${marker.label ? ` ${marker.label}` : ""}`)
        .join("; "),
      captionCues
        .filter((cue) => cue.time >= recordCursor - 0.001 && cue.time <= recordCursor + length + 0.001)
        .map((cue) => `${secondsToTimecode(cue.time, rate)}-${secondsToTimecode(cue.endTime, rate)} ${cue.text}`)
        .join("; "),
    ]);
    recordCursor += length;
  });
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function exportTimeline(format: TimelineExportFormat, input: TimelineExportInput): TimelineExportResult {
  const ranges = normalizeTimeRanges(input.keepRanges, input.sourceDuration);
  const projectName = input.projectName.trim();
  const stem = `${projectName ? safeStem(projectName) : safeStem(input.sourceName, true)}${input.revision ? `-r${input.revision}` : "-draft"}`;
  const common = { clips: ranges.length, duration: outputDuration(ranges), frameRate: normalizedFrameRate(input.frameRate) };
  if (format === "edl") return { ...common, content: buildCmx3600Edl(input), fileName: `${stem}.edl`, mimeType: "text/plain; charset=utf-8" };
  if (format === "csv") return { ...common, content: buildTimelineCsv(input), fileName: `${stem}.csv`, mimeType: "text/csv; charset=utf-8" };
  return { ...common, content: buildOtioTimeline(input), fileName: `${stem}.otio`, mimeType: "application/vnd.otio+json; charset=utf-8" };
}
