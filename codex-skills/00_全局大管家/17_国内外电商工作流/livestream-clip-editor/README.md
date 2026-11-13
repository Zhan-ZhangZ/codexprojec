<div align="center">

# 🎬 livestream-clip-editor
### 电商直播切片短视频 · 工业级全自动剪辑引擎 & AI Agent Skill

**句级跳剪 · 1.25x提速 · 双逼单收尾 · 防同质化去重 · 100%清除AI工具指纹**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8%2B-green.svg)](https://www.python.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-4.4%2B-red.svg)](https://ffmpeg.org/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill%20Ready-purple.svg)](https://claude.ai/code)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

[English Documentation](README_EN.md) · [报告 Bug / 提交建议](https://github.com/avisii1680769-cell/livestream-clip-editor/issues)

</div>

---

## 💡 为什么需要本项目？

在抖音、快手、视频号等短视频平台进行**直播切片带货**时，传统剪辑面临四大核心痛点：

1. **极其耗时**：剪映手动抽帧、微调位置、加画中画、去气口，制作一条 1 分钟切片耗费 20~30 分钟；
2. **色差客诉**：去重教程盲目套用复古/滤镜，导致服饰/美妆产品严重偏色，买家收到实物差评退款；
3. **平台限流/判搬运**：简单的变速或镜像无法突破平台的 pHash、时域抽样和音频声学指纹检测；
4. **被平台误判为 AI 自动化生成**：批处理工具未清除元数据，导致文件携带 `Lavf`、`Lavc libx264`、`x264 - core` SEI 编码指纹，被平台风控直接识别为脚本批量生成。

**`livestream-clip-editor` 将剪映 20 分钟的手动繁琐流程，升维为 10 秒全自动算法管线，并在比特流底层彻底抹除一切工具指纹！**

---

## 🌟 核心特性

| 模块 | 核心功能 | 解决痛点 |
| :--- | :--- | :--- |
| ✂️ **跳剪拼接 (Jump-Cut)** | 依托 faster-whisper 句级时间戳，硬切句间废话、口水音与停顿气口 | 节奏拖沓、用户滑走 |
| ⚡ **明快节奏 (1.25x不变调)** | `setpts` 与 `atempo` 协同变速，语速紧凑有力，人声音调绝对保真 | 说话无感染力、语速慢 |
| 🎯 **双逼单收尾 (Dual-CTA)** | 环节①「价格库存催促」+ 环节②「强促抢拍压轴」，终帧正脸强CTA锁定 | 结尾无力、转化率低 |
| 🛡️ **工业级去重 (--dedup)** | 2%微裁切放大 + 时域动态微噪点(`alls=2`) + 面料保真微锐化 + 三段声学EQ频响 | 突破L1~L5平台同质化审核 |
| 🥷 **AI/工具指纹脱敏** | 物理剥离 x264 SEI NALU + 清空 Stream 级 Encoder + 伪装 `brand mp42` + PTS连续重映射 | 彻底消除自动化批处理特征 |
| 🔍 **自动化质检验收** | 自动校验时长、黑帧、音频防削波，内置底层二进制特征扫描拦截 | 交付即合格，上架即过审 |

---

## 🔄 自动化处理全流程

```
[直播录屏原片 (1~4小时)]
       │
       ▼ 步骤 1：原片勘察 (probe_media.py & contact_sheet.py)
  [说话占比 / 切点分析 / 视觉联系表 (mm:ss网格图)]
       │
       ▼ 步骤 2：中文智能转写 (transcribe.py - Whisper int8)
  [句级带标点时间戳 JSON / TXT]
       │
       ▼ 步骤 3：高转化选句 (EDL 决策表)
  [钩子 (0-10s) ➔ 卖点精华 (10-45s) ➔ 双逼单压轴 (45-65s)]
       │
       ▼ 步骤 4：工业级渲染引擎 (render_edit.py --dedup --jitter)
  ┌────────────────────────────────────────────────────────┐
  │  视频链: PTS强制重映射 ➔ 1.25x ➔ 2%微裁切 ➔ eq直方图微扰 │
  │          ➔ 面料锐化 ➔ 时域动态微噪点 ➔ 边缘淡入淡出     │
  │  音频链: PTS重映射 ➔ atempo ➔ 三段EQ ➔ 响度归一化      │
  │          ➔ alimiter防削波 ➔ 边缘音频淡出                │
  │  脱敏链: -x264-params info=0 ➔ -bsf remove_types=6    │
  │          ➔ stream encoder清除 ➔ -brand mp42 伪装        │
  └────────────────────────────────────────────────────────┘
       │
       ▼ 步骤 5：自动化质检拦截 (verify_output.py)
  [时长/黑帧/音量 PASS] + [二进制扫描 SEI/Lavf/Lavc CLEAN] ➔ 交付上架！
```

---

## 🚀 极速上手

### 1. 环境准备
- 确保系统安装了 `ffmpeg` 和 `ffprobe` 并位于 PATH 路径中。
- 安装 Python 依赖（推荐清华镜像）：
  ```bash
  pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
  ```

### 2. 五步剪出成品

#### ① 勘察素材
```bash
python scripts/probe_media.py input.mp4
python scripts/contact_sheet.py input.mp4 sheet.jpg --interval 10
```

#### ② 语音转写
```bash
python scripts/transcribe.py input.mp4 trans --model small --outdir .
```

#### ③ 制定 EDL 剪辑决策表 (`edl.json`)
参考 `examples/sample_edl.json`：
```json
{
  "name": "带货切片_双逼单模板",
  "speed": 1.25,
  "dedup": true,
  "edl": [
    [108.76, 118.02],
    [129.28, 142.37],
    [296.34, 300.34],
    [379.17, 382.17]
  ]
}
```

#### ④ 一键工业级渲染
```bash
python scripts/render_edit.py \
  --src input.mp4 \
  --edl edl.json \
  --out output.mp4 \
  --speed 1.25 \
  --crf 19 \
  --dedup \
  --jitter
```

#### ⑤ 自动化质检验收
```bash
python scripts/verify_output.py output.mp4 --target-min 55 --target-max 75 --sheet verify_sheet.jpg
```
控制台全部显示 `[PASS]` 且底层无任何指纹残留，即可放心发布！

---

## 🤖 在 AI Agent 中作为 Skill 调用

本仓库天然遵循 Agent Skill 规范，开箱即用：

- **Claude Code**: 将本仓库直接放入项目的 `.claude/skills/livestream-clip-editor/` 目录下；
- **Qoder**: 放入 `~/.qoder-cn/skills/livestream-clip-editor/`；
- **Trae**: 放入 `.trae/skills/livestream-clip-editor/`。

在对话框直接说：**“帮我把这段直播录屏剪成带货切片，结尾要双逼单收尾”**，AI Agent 将自动触发执行全套流程！

---

## 💬 交流探讨与定制开发

如果您对本套 **直播切片自动化、短视频矩阵防同质化、音视频底层算法工程** 感兴趣，或有更复杂的短视频/电商自动化、AI Agent 工作流、工具链定制需求，欢迎添加作者微信交流合作！

- 🤝 **技术交流**：短视频防搬运去重算法、FFmpeg 工业级滤镜管线、Whisper ASR 调优与落地经验探讨；
- 🛠️ **定制开发**：承接各类短视频全自动剪辑分发系统、电商矩阵带货工具、私域获客自动化、数据跑批与各类定制化工具开发。

<div align="center">
  <img src="assets/wechat_contact.jpg" width="240" alt="WeChat Contact: Gabor Lu" />
  <p><b>微信扫码添加作者（Gabor Lu · 广东东莞）</b><br><sub>添加时请备注：技术交流 / 工具定制</sub></p>
</div>

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 免费开源开放。欢迎 Star、Fork 并集成到您的商业业务中！
