---
name: chubbyskills
description: 中文全渠道内容采集与个人知识库 AI 技能集（14 个子技能，按大管家路由架构暴露）。覆盖 B 站/抖音/TikTok/YouTube/微博/知乎/小宇宙播客/X/小红书/微信公众号 十渠道视频转录与图文采集；统一 CLI（tools/chubby.py）串起采集→入库→检索→资料包导出全链路。本条目为包级路由入口；项目总览、能力地图、安装矩阵、平台 YAML、vault 模板等详见包内 README.md。Leading Words: 中文内容采集, 视频转录, 字幕优先, 个人知识库, Obsidian 整理, GBrain, GraphRAG, 小红书采集, 公众号采集, B站转录, 抖音转录, 知乎采集, 播客转录, X图文采集, 资料包导出, 知识库索引, MCP知识库
license: MIT
version: 0.13.0
metadata:
  upstream: github.com/chubbyguan/chubbyskills
  type: router-package
---

# chubbyskills（包路由入口）

本条目仅做**派发**，不重述项目能力。先读：

1. **整体路由约定 / 单入口 / 上下文红线**：[大管家 SKILL.md](../../../SKILL.md)
2. **本项目能做什么、怎么用、装什么依赖、平台适配细节、vault 模板等**：[本包 README.md](./README.md)（如需英文版本见 [README.en.md](./README.en.md)）

按 README 读完后，按用户意图打开对应子技能的 `SKILL.md`：

| 子技能 | 入口 | 一句话 |
|---|---|---|
| `bilibili-transcribe/` | `./bilibili-transcribe/SKILL.md` | B 站 → 字幕优先 → Markdown |
| `douyin-transcribe/` | `./douyin-transcribe/SKILL.md` | 抖音 → Markdown |
| `tiktok-transcribe/` | `./tiktok-transcribe/SKILL.md` | TikTok → Markdown |
| `youtube-transcribe/` | `./youtube-transcribe/SKILL.md` | YouTube → Markdown |
| `weibo-transcribe/` | `./weibo-transcribe/SKILL.md` | 微博视频 → Markdown |
| `zhihu-transcribe/` | `./zhihu-transcribe/SKILL.md` | 知乎视频 → Markdown |
| `podcast-transcribe/` | `./podcast-transcribe/SKILL.md` | 播客/小宇宙/RSS → Markdown（faster-whisper） |
| `x-ingest/` | `./x-ingest/SKILL.md` | X(Twitter) → Markdown |
| `xiaohongshu-ingest/` | `./xiaohongshu-ingest/SKILL.md` | 小红书图文/视频 → Markdown + 爆款拆解 |
| `wechat-article-ingest/` | `./wechat-article-ingest/SKILL.md` | 公众号/PDF → Markdown |
| `content-enrich/` | `./content-enrich/SKILL.md` | 摘要/标签加工层 |
| `knowledge-base-management/` | `./knowledge-base-management/SKILL.md` | vault 全生命周期 + GBrain + MCP |
| `learning-notes-automation/` | `./learning-notes-automation/SKILL.md` | 知识点/闪卡/知识图谱 |
| `industry-intelligence-radar/` | `./industry-intelligence-radar/SKILL.md` | 多源情报/每日简报 |

跨子技能流水线（init→采集→入库→检索→导出）走统一 CLI：`python3 tools/chubby.py <子命令> --vault "$VAULT_DIR"`（细节见 README）。