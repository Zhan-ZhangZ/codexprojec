#!/usr/bin/env python3
"""Verify a rendered reel: duration/codec, no black frames, audio not clipped.

Usage: python verify_output.py <out.mp4> [--target-min 55] [--target-max 75] [--sheet out.jpg]
Checks with ffprobe + blackdetect + volumedetect, prints PASS/FAIL per check and a summary.
With --sheet, also writes a contact sheet (via contact_sheet.py) so the closing shot can be eyeballed.
"""
import argparse, json, re, shutil, subprocess, sys, os


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return (r.stdout or "") + (r.stderr or "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--target-min", type=float, default=55)
    ap.add_argument("--target-max", type=float, default=75)
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--sheet-interval", type=float, default=6)
    a = ap.parse_args()
    ff = shutil.which("ffmpeg")
    fp = shutil.which("ffprobe")
    if not ff or not fp:
        print("ERROR: ffmpeg/ffprobe not on PATH"); sys.exit(1)

    meta = json.loads(run([fp, "-v", "error", "-show_format", "-show_streams", "-of", "json", a.video]))
    v = next((s for s in meta["streams"] if s["codec_type"] == "video"), {})
    au = next((s for s in meta["streams"] if s["codec_type"] == "audio"), {})
    dur = float(meta["format"]["duration"])

    blk = run([ff, "-hide_banner", "-i", a.video, "-vf",
               "blackdetect=d=0.1:pix_th=0.10", "-an", "-f", "null", "-"])
    black_starts = re.findall(r"black_start:([0-9.]+)", blk)

    vol = run([ff, "-hide_banner", "-i", a.video, "-af", "volumedetect", "-vn", "-f", "null", "-"])
    mean = re.search(r"mean_volume:\s*(-?[0-9.]+)", vol)
    mx = re.search(r"max_volume:\s*(-?[0-9.]+)", vol)
    mean_db = float(mean.group(1)) if mean else None
    max_db = float(mx.group(1)) if mx else None

    checks = []
    checks.append(("duration in target", a.target_min <= dur <= a.target_max,
                   f"{dur:.2f}s (target {a.target_min:g}-{a.target_max:g}s)"))
    checks.append(("video codec h264", v.get("codec_name") == "h264", v.get("codec_name")))
    checks.append(("pix_fmt yuv420p", v.get("pix_fmt") == "yuv420p", v.get("pix_fmt")))
    checks.append(("has audio", au.get("codec_name") is not None, au.get("codec_name")))
    checks.append(("no black frames", len(black_starts) == 0, f"{len(black_starts)} detected"))
    checks.append(("audio not clipped", max_db is not None and max_db <= -0.5,
                   f"max {max_db} dB / mean {mean_db} dB"))

    # 元数据脱敏与去AI指纹校验（铁律：必须全部通过）
    v_encoder = v.get("tags", {}).get("encoder", "")
    a_encoder = au.get("tags", {}).get("encoder", "")
    checks.append(("no stream encoder tags", not v_encoder and not a_encoder,
                   f"v='{v_encoder}', a='{a_encoder}'" if (v_encoder or a_encoder) else "clean"))

    with open(a.video, "rb") as _bf:
        raw_head = _bf.read(300000)
    leak_kw = [kw for kw in (b"x264 - core", b"Lavf", b"Lavc") if kw in raw_head]
    checks.append(("no bitstream tool fingerprints", len(leak_kw) == 0,
                   f"found: {[k.decode('latin1') for k in leak_kw]}" if leak_kw else "clean (no SEI/Lavf/Lavc)"))

    print(json.dumps({"duration": round(dur, 2),
                      "video": {k: v.get(k) for k in ("codec_name", "width", "height", "r_frame_rate", "pix_fmt")},
                      "audio": {k: au.get(k) for k in ("codec_name", "channels", "sample_rate")},
                      "mean_volume_db": mean_db, "max_volume_db": max_db,
                      "black_frames": len(black_starts)}, ensure_ascii=False, indent=1))
    ok = True
    for name, passed, detail in checks:
        print(f"[{'PASS' if passed else 'FAIL'}] {name}: {detail}")
        ok = ok and passed

    if a.sheet:
        here = os.path.dirname(os.path.abspath(__file__))
        r = subprocess.run([sys.executable, os.path.join(here, "contact_sheet.py"),
                            a.video, a.sheet, "--interval", str(a.sheet_interval)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(r.stdout.strip() or r.stderr.strip())
        print("NOTE: Read the sheet jpg to confirm the LAST frame is the intended closing shot.")

    print("RESULT:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}"); sys.exit(1)