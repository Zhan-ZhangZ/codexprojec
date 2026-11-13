#!/usr/bin/env python3
"""Render a jump-cut, sped-up highlight reel from an EDL (edit decision list).

Usage: python render_edit.py --src <video> --edl <edl.json> --out <out.mp4> [--speed 1.25]
edl.json = ordered list of [start,end] raw-source seconds (or [{"start":..,"end":..}]).
Also accepts {"edl":[...],"speed":1.25}; the stored speed is used unless --speed is overridden.
Blocks are hard-cut concatenated (removes inter-sentence dead air), then whole reel is
sped up (setpts + atempo, pitch preserved), loudness-normalized and peak-limited.
No subtitles / no BGM are added.
"""
import argparse, hashlib, json, os, random, shutil, subprocess, sys, time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--edl", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--speed", type=float, default=1.25)
    ap.add_argument("--crf", default="19")
    ap.add_argument("--dedup", action="store_true", help="启用防搬运/防同质化深度去重引擎(微裁切放大+微噪点+安全锐化+色彩直方图微扰+音频高频透亮)")
    ap.add_argument("--crop-ratio", type=float, default=0.98, help="去重微裁切比例(默认0.98，放大约2%%打破像素坐标对齐)")
    ap.add_argument("--jitter", action="store_true", help="启用矩阵微抖动(自动对缩放/对比/亮度/频响注入微小随机波动，适合多账号分发)")
    a = ap.parse_args()
    # 确保每次渲染使用唯一随机种子（防止多次渲染产生比特级相同的输出）
    seed_material = f"{a.src}:{a.out}:{os.getpid()}:{time.time_ns()}"
    random.seed(hashlib.sha256(seed_material.encode()).digest())
    ff = shutil.which("ffmpeg")
    fp = shutil.which("ffprobe")
    orig_w, orig_h = 544, 960
    if fp:
        try:
            p_res = subprocess.run([fp, "-v", "error", "-select_streams", "v:0",
                                    "-show_entries", "stream=width,height", "-of", "json", a.src],
                                   capture_output=True, text=True)
            p_data = json.loads(p_res.stdout)
            v_s = p_data.get("streams", [{}])[0]
            orig_w = int(v_s.get("width", 544))
            orig_h = int(v_s.get("height", 960))
        except Exception:
            pass

    with open(a.edl, encoding="utf-8") as _f:
        doc = json.load(_f)
    raw_edl = doc["edl"] if isinstance(doc, dict) and "edl" in doc else doc
    edl = [(x[0], x[1]) if isinstance(x, (list, tuple)) else (x["start"], x["end"]) for x in raw_edl]
    if not edl:
        print("ERROR: empty EDL"); sys.exit(1)
    if isinstance(doc, dict) and "speed" in doc and a.speed == 1.25:
        a.speed = float(doc["speed"])
    if isinstance(doc, dict) and doc.get("dedup") and not a.dedup:
        a.dedup = True
    raw = sum(e - s for s, e in edl)
    final = raw / a.speed
    dedup_tag = " [DEDUP: ON]" if a.dedup else ""
    print(f"blocks={len(edl)} raw={raw:.2f}s speed={a.speed} final~{final:.2f}s{dedup_tag}", flush=True)

    parts = []
    for i, (s, e) in enumerate(edl):
        parts.append(f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS[v{i}];")
        parts.append(f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS[a{i}];")
    cin = "".join(f"[v{i}][a{i}]" for i in range(len(edl)))
    parts.append(f"{cin}concat=n={len(edl)}:v=1:a=1[cv][ca];")

    # 视频链：PTS强制重映射(消除concat拼接缝) + 提速 + [去重链] + 格式化与淡入淡出
    v_filters = [f"setpts=N/{a.speed}/FRAME_RATE/TB"]
    if a.dedup:
        # 1. 微裁切与居中微放大（打破像素矩阵绝对对齐，消除原片边缘参考系，并精准还原原画幅宽高）
        cr = max(0.90, min(0.999, a.crop_ratio))
        if a.jitter:
            cr += random.uniform(-0.008, 0.008)
            cr = max(0.92, min(0.995, cr))
        v_filters.append(f"crop=trunc(in_w*{cr:.4f}/2)*2:trunc(in_h*{cr:.4f}/2)*2,scale={orig_w}:{orig_h}:flags=lanczos")
        # 2. 直方图微扰动（对比度微调，亮度微调，饱和度微调，打乱像素色域特征同时严格保真女装原色）
        contrast = 1.02 + (random.uniform(-0.008, 0.008) if a.jitter else 0.0)
        brightness = 0.01 + (random.uniform(-0.004, 0.004) if a.jitter else 0.0)
        saturation = 1.02 + (random.uniform(-0.008, 0.008) if a.jitter else 0.0)
        v_filters.append(f"eq=contrast={contrast:.4f}:brightness={brightness:.4f}:saturation={saturation:.4f}")
        # 3. 画面锐化（增强面料纹理与清晰度）
        v_filters.append("unsharp=3:3:0.6:3:3:0.0")
        # 4. 肉眼不可见动态时域微噪点（替代1%画中画，破坏pHash与感知哈希检测）
        noise_strength = random.randint(2, 3) if a.jitter else 2
        v_filters.append(f"noise=alls={noise_strength}:allf=t+u")
    v_filters.append("format=yuv420p")
    fade_out_v = max(0.0, final - 0.3)
    v_filters.append(f"fade=t=in:st=0:d=0.2,fade=t=out:st={fade_out_v:.3f}:d=0.3[outv];")
    parts.append(f"[cv]{','.join(v_filters)}")

    # 音频链：PTS重映射 + 提速 + [去重链：人声频响微整形改写声学指纹] + 响度归一化 + 防削波限幅 + 淡入淡出
    a_filters = ["asetpts=N/SR/TB", f"atempo={a.speed}"]
    if a.dedup:
        # 三段EQ微扰人声中高频响应（改写音频哈希指纹，且听感更加透亮）
        eq1_g = 1.0 + (random.uniform(-0.2, 0.2) if a.jitter else 0.0)
        eq2_g = 0.8 + (random.uniform(-0.15, 0.15) if a.jitter else 0.0)
        eq3_g = -0.5 + (random.uniform(-0.1, 0.1) if a.jitter else 0.0)
        a_filters.append(f"equalizer=f=1200:t=q:w=1.2:g={eq1_g:.3f},equalizer=f=3500:t=q:w=1.5:g={eq2_g:.3f},equalizer=f=6000:t=q:w=2.0:g={eq3_g:.3f}")
    a_filters.append("loudnorm=I=-16:TP=-2.0:LRA=11")
    a_filters.append("alimiter=limit=0.891:level=false")
    fade_out_a = max(0.0, final - 0.25)
    a_filters.append(f"afade=t=in:st=0:d=0.15,afade=t=out:st={fade_out_a:.3f}:d=0.25[outa]")
    parts.append(f"[ca]{','.join(a_filters)}")
    fc = "".join(parts)

    cmd = [ff, "-hide_banner", "-loglevel", "error", "-y",
           "-err_detect", "ignore_err", "-fflags", "+discardcorrupt",
           "-i", a.src,
           "-filter_complex", fc, "-map", "[outv]", "-map", "[outa]",
           "-c:v", "libx264", "-preset", "medium", "-crf", a.crf,
           "-profile:v", "high",
           "-x264-params", "info=0",
           "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
           "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
           "-map_metadata", "-1",
           "-metadata:s:v:0", "encoder=",
           "-metadata:s:a:0", "encoder=",
           "-metadata:s:v:0", "handler_name=",
           "-metadata:s:a:0", "handler_name=",
           "-bsf:v", "filter_units=remove_types=6",
           "-brand", "mp42",
           "-movflags", "+faststart", a.out]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print("FFMPEG ERROR:", (r.stderr or "")[-2500:]); sys.exit(1)
    print(f"WROTE {a.out} (~{final:.1f}s)", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}"); sys.exit(1)