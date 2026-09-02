---
name: claude-real-video
description: 一款能够让大语言模型（LLM）“看懂”视频的本地视觉增强技能。它通过自动场景检测、滑动窗口去重提取出最关键的视频帧，并结合 Whisper 提取双语字幕与时间轴，最终输出让智能体可以原生阅读的纯本地视频内容清单。
version: 0.10.3
---

# claude-real-video

`crv`：让任何 AI Agent「看懂」视频的本地管线——场景感知关键帧提取、滑动窗口去重、Whisper 双语字幕与时间轴，输出 Agent 可原生阅读的视频内容清单。用户给出视频 URL 或文件要求分析/总结/讨论时触发。

## 统一入口（优先读这个）

- **[references/skills/claude-real-video-for-agents/SKILL.md](references/skills/claude-real-video-for-agents/SKILL.md)** — 上游官方 Agent 技能（221 行）：安装、触发条件、输出解读、调用约定
- [references/skills/claude-real-video/SKILL.md](references/skills/claude-real-video/SKILL.md) — 核心技能定义（精简版）
- [references/install-skill.sh](references/install-skill.sh) — 上游官方安装脚本

## v0.10.3 要点（2026-08-31）

- 平台 `.vtt` 字幕头的 `WEBVTT`/`Kind:`/`Language:` 行不再混入转录正文
- 完整历史见 [references/CHANGELOG.md](references/CHANGELOG.md)

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明（安装/用法/示例图）
- [references/CHANGELOG.md](references/CHANGELOG.md) — 变更史
- [references/server.json](references/server.json) — MCP 服务器清单
- [references/ATTRIBUTIONS.md](references/ATTRIBUTIONS.md)、[references/SECURITY.md](references/SECURITY.md)、[references/LICENSE](references/LICENSE)

> 上游为 PyPI `claude-real-video` 分发（本地跑 Whisper/ffmpeg），仓库含 302M 提交进库的 `.venv312` 虚拟环境、35M marketing、benchmark 与 src/tests；本库只携文档层与官方 skill，需要时访问 [上游仓库](https://github.com/HUANGCHIHHUNGLeo/claude-real-video/tree/v0.10.3)。
