<div align="center">

# 🎬 livestream-clip-editor
### Automated Livestream Video Clipping Engine & AI Agent Skill for E-Commerce

**Jump-Cut Stitching · 1.25x Pitch-Preserved Speedup · Dual-CTA Closing · Anti-Deduplication · 100% De-Fingerprinted Bitstream**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8%2B-green.svg)](https://www.python.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-4.4%2B-red.svg)](https://ffmpeg.org/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill%20Ready-purple.svg)](https://claude.ai/code)

[中文文档](README.md) · [Report Bug / Request Feature](https://github.com/avisii1680769-cell/livestream-clip-editor/issues)

</div>

---

## 💡 Overview

`livestream-clip-editor` is an open-source, automated video editing engine designed to turn lengthy raw livestream recordings (1-4 hours) into high-converting ~60s short clips for TikTok, Douyin, Kuaishou, and WeChat Channels in under **10 seconds**.

It completely replaces 20-30 minutes of manual cutting in CapCut/Jianying, applies mathematical anti-deduplication filters (2% micro-crop, temporal micro-noise, fabric unsharp, 3-band vocal EQ), enforces a high-conversion **Dual Call-To-Action (Dual-CTA)** ending, and **physically strips all x264 SEI NALUs and container metadata** so the output video leaves zero automated tool fingerprints.

---

## 🌟 Key Capabilities

1. **Jump-Cut Sentence Stitching**: Driven by `faster-whisper` sentence-level timestamps to strip all dead air, stutters, and breathing sounds.
2. **1.25x Speedup with Original Pitch**: Tightens delivery pace while preserving natural human vocal timbre.
3. **Dual-CTA Closing**:
   - CTA Part 1: Stock urgency + price drop;
   - CTA Part 2: Buy-now push + product showcase with anchor facing the camera.
4. **Algorithmic Anti-Deduplication (`--dedup` & `--jitter`)**:
   - 2% crop + Lanczos scaling to break coordinate grid alignment;
   - Imperceptible temporal micro-noise (`noise=alls=2:allf=t+u`) invalidating platform pHash/dHash;
   - +2% contrast & unsharp mask enhancing texture while preserving <0.5% color accuracy (zero return disputes);
   - 3-band parametric EQ (1200Hz/3500Hz/6000Hz) altering acoustic fingerprints;
   - Randomized Gaussian matrix jitter for multi-account batching.
5. **Bitstream De-Fingerprinting**:
   - Strips `x264 - core` SEI NALUs via `-x264-params info=0` & `-bsf:v filter_units=remove_types=6`;
   - Cleans stream-level encoder tags (`Lavc libx264`);
   - Spoofs container brand as `mp42` instead of FFmpeg's `isom/512`;
   - Enforces PTS remapping (`setpts=N/{speed}/FRAME_RATE/TB`) eliminating concat timeline cracks.
6. **Built-in Quality Verification (`verify_output.py`)**:
   - Scans output binary for SEI, Lavf, and Lavc traces;
   - Verifies duration (55-75s), black frames, and peak volume limit.

---

## 🚀 Quickstart

### 1. Requirements
- `ffmpeg` and `ffprobe` in PATH
- Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```

### 2. Five-Step Pipeline
```bash
# 1. Probe media
python scripts/probe_media.py input.mp4

# 2. Transcribe speech
python scripts/transcribe.py input.mp4 trans --model small --outdir .

# 3. Create your EDL decision list (edl.json)
# 4. Render with industrial de-fingerprinting
python scripts/render_edit.py --src input.mp4 --edl edl.json --out output.mp4 --speed 1.25 --crf 19 --dedup --jitter

# 5. Verify quality & binary fingerprints
python scripts/verify_output.py output.mp4 --target-min 55 --target-max 75 --sheet verify_sheet.jpg
```

---

## 💬 Contact & Custom Tool Development

For inquiries, technical exchange on video deduplication algorithms, or custom AI Agent / RPA tool development:

<div align="center">
  <img src="assets/wechat_contact.jpg" width="220" alt="WeChat Contact: Gabor Lu" />
  <p><b>WeChat: Gabor Lu (Dongguan, Guangdong, China)</b><br><sub>Note: Technical Exchange / Custom Development</sub></p>
</div>

---

## 📄 License

MIT License. Free and open source for everyone!
