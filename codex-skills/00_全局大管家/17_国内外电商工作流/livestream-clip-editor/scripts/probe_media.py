#!/usr/bin/env python3
"""Probe a video: metadata, speech pauses, jump-cut points, loudness.

Usage: python probe_media.py <video> [--silence-db -32] [--silence-d 0.35] [--scene 0.12]
Prints a concise JSON-ish summary usable for choosing cut points / analyzing a reference edit.
"""
import argparse, json, re, shutil, subprocess, sys


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return (r.stdout or "") + (r.stderr or "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--silence-db", type=float, default=-32)
    ap.add_argument("--silence-d", type=float, default=0.35)
    ap.add_argument("--scene", type=float, default=0.12)
    a = ap.parse_args()
    ff = shutil.which("ffmpeg")
    fp = shutil.which("ffprobe")
    if not ff or not fp:
        print("ERROR: ffmpeg/ffprobe not on PATH"); sys.exit(1)

    meta = json.loads(run([fp, "-v", "error", "-show_format", "-show_streams", "-of", "json", a.video]))
    v = next((s for s in meta["streams"] if s["codec_type"] == "video"), {})
    au = next((s for s in meta["streams"] if s["codec_type"] == "audio"), {})
    dur = float(meta["format"]["duration"])

    sil = run([ff, "-hide_banner", "-i", a.video, "-af",
               f"silencedetect=noise={a.silence_db}dB:d={a.silence_d}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start:\s*([0-9.]+)", sil)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([0-9.]+)", sil)]
    pauses = [{"start": s, "end": e, "mid": round((s + e) / 2, 2)} for s, e in zip(starts, ends)]

    sc = run([ff, "-hide_banner", "-i", a.video, "-vf",
              f"select='gt(scene,{a.scene})',showinfo", "-f", "null", "-"])
    cuts = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", sc)]

    loud = run([ff, "-hide_banner", "-i", a.video, "-af",
               "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', loud, re.S)
    loudness = json.loads(m.group(0)) if m else {}

    speech = dur - sum(p["end"] - p["start"] for p in pauses)
    out = {
        "duration": round(dur, 2),
        "video": {k: v.get(k) for k in ("codec_name", "width", "height", "r_frame_rate", "pix_fmt")},
        "audio": {k: au.get(k) for k in ("codec_name", "channels", "sample_rate")},
        "pauses": pauses,
        "pause_count": len(pauses),
        "speech_ratio": round(speech / dur, 3) if dur else 0,
        "jump_cuts": cuts,
        "input_loudness_i": loudness.get("input_i"),
        "input_true_peak": loudness.get("input_tp"),
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}"); sys.exit(1)