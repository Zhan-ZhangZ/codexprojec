#!/usr/bin/env python3
"""Extract timestamped frames and build a labeled contact sheet for visual review.

Usage: python contact_sheet.py <video> <out.jpg> [--interval 10] [--cols 7] [--cell-w 156]
Read the resulting jpg with the Read tool to map content/looks over time.
"""
import argparse, os, shutil, subprocess, sys, tempfile


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--interval", type=float, default=10)
    ap.add_argument("--cols", type=int, default=7)
    ap.add_argument("--cell-w", type=int, default=156)
    a = ap.parse_args()
    from PIL import Image, ImageDraw, ImageFont

    ff = shutil.which("ffmpeg")
    tmp = tempfile.mkdtemp(prefix="cs_")
    subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-i", a.video,
                    "-vf", f"fps=1/{a.interval}", "-q:v", "3", os.path.join(tmp, "f_%03d.jpg")],
                   check=True)
    files = sorted(f for f in os.listdir(tmp) if f.endswith(".jpg"))
    if not files:
        print("ERROR: no frames extracted"); sys.exit(1)

    cw = a.cell_w
    ch = round(cw * 16 / 9)
    lh = 26
    cols = a.cols
    rows = (len(files) + cols - 1) // cols
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 20)
    except Exception:
        font = ImageFont.load_default()
    sheet = Image.new("RGB", (cols * cw, rows * (ch + lh)), (18, 18, 18))
    d = ImageDraw.Draw(sheet)
    for i, fn in enumerate(files):
        im = Image.open(os.path.join(tmp, fn)).convert("RGB").resize((cw, ch), Image.LANCZOS)
        x = (i % cols) * cw
        y = (i // cols) * (ch + lh)
        sheet.paste(im, (x, y + lh))
        t = i * a.interval
        d.text((x + 4, y + 3), f"{int(t)//60:02d}:{int(t)%60:02d}", font=font, fill=(255, 220, 0))
    sheet.save(a.out, quality=88)
    print(f"sheet {a.out} size={sheet.size} frames={len(files)} interval={a.interval}s")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}"); sys.exit(1)