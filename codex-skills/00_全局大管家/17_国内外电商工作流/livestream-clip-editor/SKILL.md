---
name: livestream-clip-editor
description: 把直播录屏剪成约1分钟、提速、精华拼接（jump-cut）、以双逼单收尾的带货短视频；不加字幕不加BGM。当用户给出直播录频/录屏原片要求做切片带货、高光拼接、精华剪辑、按参考成品重剪、或要求钩子开头+双逼单结尾的短视频时使用。内置FFmpeg工业级去重与x264比特流SEI脱敏。也用于反推参考成品的剪辑参数（语速/切点/响度）。触发词：直播录屏、切片、带货、精华拼接、高光、逼单、双逼单、jump-cut、重剪、约1分钟。
---

# 直播切片精华拼接剪辑器

把冗长直播录屏剪成 ~60s、节奏明快、**钩子开头 → 卖点精华 → 双逼单收尾**的带货短视频。
手法 = 切片拼接（句间硬切去气口）+ 整体提速（默认 1.25x，不变调）+ 响度归一/限幅 + 比特流SEI脱敏。**不加字幕、不加 BGM**。

## 何时用

- 用户给直播录屏原片，要切片带货 / 高光 / 精华拼接 / 约1分钟短视频。
- 用户给一个「参考成品」要求按它的风格重剪原片。
- 用户明确要求逼单收尾、双逼单、提速、不要字幕/BGM。

## 流程（按序执行，细节见 references/editing-recipe.md）

1. **确认需求**：目标时长（默认 55–75s）、提速倍率（默认 1.25）、是否字幕/BGM（默认都不加）、
   收尾必须逼单且末帧为强 CTA 画面、输出目录/文件名。缺这些信息才问，否则用默认值直接做。
2. **勘察**：`scripts/probe_media.py <片>` 拿时长/气口/说话占比/响度；有参考片也 probe 它反推参数。
   `scripts/contact_sheet.py <片> sheet.jpg --interval 10` 生成联系表，用 Read 看，标记钩子/卖点/逼单/好姿态段落。
3. **转写**：`scripts/transcribe.py <原片> transcript --model small --outdir .` 得句级时间戳 json+txt 与字/秒语速。
4. **选句写 EDL**（人工判断，最关键）：读 transcript.txt，按 钩子→卖点→双逼单收尾 挑完整句子块，
   去废话/气口/跑题；结尾建议安排【双逼单环节】（环节1价格库存催促 + 环节2立即抢拍压轴）；把正脸直视镜头/手持产品的强CTA逼单句放 EDL 末尾。存 `edl.json`。
   总原始时长 ≈ 目标 × 倍率。
5. **渲染**：`scripts/render_edit.py --src <原片> --edl edl.json --out 成品.mp4 --speed 1.25 --crf 19 [--dedup] [--jitter]`。
   内部：trim/atrim 每块 → concat 硬拼 → PTS强制重映射 → setpts/atempo 提速 → [可选 --dedup 深度去重链：2%微裁切放大+直方图微扰+服饰保真锐化+时域动态微噪点(alls=2)+三段人声EQ] → loudnorm+alimiter → 边缘淡入淡出 → x264 SEI物理剥离 + stream级encoder脱敏 + brand mp42 容器伪装。
6. **校验**：`scripts/verify_output.py 成品.mp4 --target-min 55 --target-max 75 --sheet fin_sheet.jpg`。
   全 PASS 才交付（内置底层二进制扫描 SEI/Lavf/Lavc，任何指纹残留即判定 FAIL）；用 Read 看 fin_sheet.jpg 确认末帧是逼单强 CTA 正脸。末帧弱 → 回第 4 步挪块重渲染。
7. **交付**：成品放用户指定目录；按需附 edl.json / transcript.txt / 联系表 / 一句话清单。

## 脚本（scripts/，均 argparse、简洁 stdout、出错打印 ERROR 不抛栈）

- `probe_media.py <video> [--silence-db -32] [--silence-d 0.35] [--scene 0.12]` → JSON：时长/编码/气口/说话占比/切点/响度。
- `transcribe.py <media> <tag> [--model small] [--outdir .]` → `<tag>.json/.txt` + 字/秒；内置 Windows/中国网络修复。
- `contact_sheet.py <video> <out.jpg> [--interval 10] [--cols 7] [--cell-w 156]` → 带 mm:ss 标签联系表。
- `render_edit.py --src --edl --out [--speed 1.25] [--crf 19] [--dedup] [--jitter]` → 拼接提速+工业级防同质化去重+矩阵随机微抖动+bitexact元数据清洗。
- `verify_output.py <video> [--target-min 55] [--target-max 75] [--sheet out.jpg] [--sheet-interval 6]` → 逐项 PASS/FAIL。

## 参考（references/）

- `editing-recipe.md`：完整配方、filter_complex 链路、选句原则、本案例 17 块实际 EDL 表。
- `dedup-algorithm-guide.md`：防搬运/防同质化算法级去重实操指南（剪映8步手工映射为FFmpeg代码链路）。
- `windows-cn-pitfalls.md`：依赖镜像、代理/HF/av/CUDA/线程/路径/削波/GBK/别名等 11 类坑与修复。

## 环境要求

ffmpeg+ffprobe 在 PATH；Python 带 `faster-whisper pillow numpy`（清华镜像安装）；纯 CPU 即可（int8）。
运行 python 设 `PYTHONIOENCODING=utf-8`；传给 ffmpeg 的路径用 `C:/...` 正斜杠形式。