#!/usr/bin/env python3
"""
SRT → 剪映草稿

用法:
  python3 srt_to_draft.py <video.srt> [--name 草稿名] [--effect 花字名] [--anim 入场动画]

例:
  python3 srt_to_draft.py demo.srt --name 我的视频 --effect 火焰燃烧花字 --anim 冲屏位移
"""
import sys, re, json, argparse, urllib.request, os, subprocess, time

API = "http://localhost:30000/openapi/capcut-mate/v1"
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ensure_service():
    """检查 capcut-mate 是否跑在 30000；没起就自动 setup 并启动（幂等）"""
    try:
        urllib.request.urlopen("http://localhost:30000/docs", timeout=1)
        return
    except Exception:
        pass
    setup = os.path.join(SKILL_DIR, "scripts", "setup.sh")
    print("🔧 capcut-mate 未运行，自动安装/启动 …", file=sys.stderr)
    subprocess.run(["bash", setup], check=True, cwd=SKILL_DIR)
    for _ in range(30):
        try:
            urllib.request.urlopen("http://localhost:30000/docs", timeout=1)
            return
        except Exception:
            time.sleep(1)
    print("❌ capcut-mate 启动超时", file=sys.stderr); sys.exit(1)

def post(path, payload):
    req = urllib.request.Request(
        f"{API}/{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def parse_srt(fp):
    """SRT → [{start, end, text}] (微秒)"""
    text = open(fp, encoding="utf-8").read().strip()
    blocks = re.split(r"\n\n+", text)
    out = []
    for b in blocks:
        lines = b.strip().split("\n")
        if len(lines) < 3: continue
        m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", lines[1])
        if not m: continue
        def to_us(h,m_,s,ms): return (int(h)*3600 + int(m_)*60 + int(s))*1_000_000 + int(ms)*1000
        start = to_us(*m.groups()[:4])
        end = to_us(*m.groups()[4:])
        out.append({"start": start, "end": end, "text": "\n".join(lines[2:])})
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("srt")
    ap.add_argument("--name", default="字幕草稿")
    ap.add_argument("--effect", default=None, help="花字名（见 references/花字清单.md）")
    ap.add_argument("--anim", default=None, help="入场动画名（见 references/动画清单.md）")
    # 用户默认预设（黄字黑底描边 + 4:3 画布 + 贴底）
    ap.add_argument("--font-size", type=int, default=7)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--text-color", default="#FFDE00")
    ap.add_argument("--border-color", default="#000000")  # 描边粗细 capcut-mate 默认 40（剪映 GUI 值），无需传参
    ap.add_argument("--transform-y", type=int, default=-850)
    ap.add_argument("--bg-video", default=None, help="背景视频 URL（capcut-mate 要求公网可访问）")
    a = ap.parse_args()

    subs = parse_srt(a.srt)
    if not subs:
        print("❌ SRT 解析为空", file=sys.stderr); sys.exit(1)
    print(f"解析到 {len(subs)} 条字幕，时长 {subs[-1]['end']/1_000_000:.1f}s")

    ensure_service()

    # 1. 建草稿
    r = post("create_draft", {"width": a.width, "height": a.height})
    draft_id = re.search(r"draft_id=(\w+)", r["draft_url"]).group(1)
    durl = f"http://localhost:30000/openapi/capcut-mate/v1/get_draft?draft_id={draft_id}"
    print(f"draft_id = {draft_id}")

    # 2. 加字幕
    caps = [{
        "start": s["start"], "end": s["end"], "text": s["text"],
        **({"text_effect": a.effect} if a.effect else {}),
        **({"in_animation": a.anim} if a.anim else {}),
    } for s in subs]
    r = post("add_captions", {
        "draft_url": durl,
        "captions": json.dumps(caps, ensure_ascii=False),
        "font_size": a.font_size,
        "text_color": a.text_color,
        "border_color": a.border_color,
        "transform_y": a.transform_y,
        "bold": True,
        "has_shadow": True,
    })
    if r.get("code") != 0:
        print(f"❌ add_captions 失败: {r}", file=sys.stderr); sys.exit(1)
    print(f"✅ 写入 {len(caps)} 条字幕")

    # 3. 保存
    post("save_draft", {"draft_url": durl})

    # 4. 重命名为友好名字（同时修正内部路径引用）
    base = os.path.expanduser("~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft")
    old_dir = os.path.join(base, draft_id)
    new_name = f"{a.name}-{draft_id[-8:]}"
    new_dir = os.path.join(base, new_name)
    if os.path.exists(old_dir):
        os.rename(old_dir, new_dir)
        # 修正 JSON 内部对旧 draft_id 目录的绝对路径引用
        for fn in ("draft_content.json", "draft_info.json"):
            fp = os.path.join(new_dir, fn)
            if not os.path.exists(fp): continue
            s = open(fp, encoding="utf-8").read()
            s = s.replace(f"/{draft_id}/", f"/{new_name}/")
            open(fp, "w", encoding="utf-8").write(s)

    print(f"\n✅ 草稿已生成: {new_name}")
    print(f"   位置: {new_dir}")
    print(f"\n下一步: Cmd+Q 退出剪映 → 重开 → 首页找「{new_name}」")

if __name__ == "__main__":
    main()
