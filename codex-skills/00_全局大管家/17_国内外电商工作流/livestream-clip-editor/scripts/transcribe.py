#!/usr/bin/env python3
"""Chinese ASR for livestream audio -> sentence-level transcript (json+txt) + speech rate.

Usage: python transcribe.py <video-or-audio> <out-tag> [--model small] [--outdir DIR]
Writes <outdir>/<tag>.json and .txt; prints segments and chars/speech-second rate.

Environment fixes baked in (Windows / China network):
  * strip *_PROXY env (httpx mis-parses NO_PROXY "[::1],::1" -> InvalidURL)
  * HF_ENDPOINT=hf-mirror.com, HF_HUB_DISABLE_XET=1 (mirror Xet/CAS reconstruction fails)
  * decode audio via ffmpeg to 16k mono float32 ndarray (avoids av>=19 metadata_errors kwarg bug)
  * CPU int8, cpu_threads=8, beam_size=1 (no CUDA12 cublas/cudnn DLLs; 32-thread thrash is slower)
"""
import argparse, json, os, shutil, subprocess, sys, time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("tag")
    ap.add_argument("--model", default="small")
    ap.add_argument("--outdir", default=".")
    a = ap.parse_args()

    for k in list(os.environ):
        if k.lower() in ("no_proxy", "http_proxy", "https_proxy", "all_proxy"):
            os.environ.pop(k, None)
    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
    os.environ["HF_HUB_DISABLE_XET"] = "1"
    os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"

    import numpy as np
    from faster_whisper import WhisperModel

    ff = shutil.which("ffmpeg")
    raw = subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-i", a.media,
                          "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32).copy()
    print(f"decoded {len(audio)/16000:.1f}s", flush=True)

    t0 = time.time()
    model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=8)
    segs, info = model.transcribe(
        audio, language="zh", word_timestamps=False, vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=300), beam_size=1,
        initial_prompt="以下是直播带货的普通话口播，介绍服装单品的面料、版型、搭配、尺码和价格。",
    )
    out = []
    for s in segs:
        out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
        print(f"[{s.start:7.2f} -> {s.end:7.2f}] {s.text.strip()}", flush=True)

    os.makedirs(a.outdir, exist_ok=True)
    json.dump(out, open(os.path.join(a.outdir, a.tag + ".json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    with open(os.path.join(a.outdir, a.tag + ".txt"), "w", encoding="utf-8") as f:
        for s in out:
            f.write(f"[{s['start']:7.2f} -> {s['end']:7.2f}] {s['text']}\n")
    chars = sum(len(s["text"]) for s in out)
    speech = sum(s["end"] - s["start"] for s in out)
    print(f"DONE {len(out)} segs chars={chars} speech={speech:.1f}s "
          f"rate={chars/speech:.2f} chars/s elapsed={time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}"); sys.exit(1)