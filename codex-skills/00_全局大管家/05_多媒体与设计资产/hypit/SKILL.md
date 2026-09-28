---
name: hypit
description: AI 智能体驱动的视频创作发行版（Hypit Distribution）。基于 SVML 标记语言与 SVS/SVRun 工作流，支持从参考视频克隆、脚本/语音/画面/字幕/特效编排到最终渲染的全链路视频生产；组件可插拔、可重用，支持本地 WhisperX 转写与 HypiHub 云端一体化。Leading Words: SVML视频创作, AI视频克隆, SVS语义快照, SVRun可重用工作流, AIGC分镜, B-roll自动生成, 词级字幕, 短视频矩阵量产
metadata:
    upstream: github.com/hypit-ai/hypit
    version: v0.1.8
---

# Hypit

- **项目主页**：https://hypit.ai
- **上游仓库**：https://github.com/hypit-ai/hypit（v0.1.8，Apache-2.0 with conditions）
- **官方安装**：`npx skills add hypit-ai/hypit -g`（用户从 npm 拉取运行时，本仓库保留**技能层与文档层**）
- **中文 README**：[README.zh-CN.md](./README.zh-CN.md)
- **项目说明**：[README.md](./README.md)
- **开发贡献**：[CONTRIBUTING.md](./CONTRIBUTING.md)

## 这是什么

Hypit 给 AI Agent（Claude Code、Codex 等）一套**视频创作语言与运行时**。Agent 拿到一段参考视频，就能把它克隆成完整工作流（素材 / 字幕 / B-roll / 特效 / 声音），全部以**词（word）而非秒（second）**为时间锚点。也可以从模板或自然语言描述出发，从零编写工作流。

整套发行版以**SVML / SVS / SVRun** 为核心：

- **SVML** — 语义视频标记语言（Semantic Video Markup Language），以词级时间锚点声明画面与编排
- **SVS** — 语义快照（Semantic Visual Snapshot），可重用的视觉/语义资产
- **SVRun** — 可执行工作流（Source/Recipe/Run 三段式），描述一次完整视频的素材、Recipe 与 Run

每条视频工作流都是**可编辑、可重跑**的——不是一次性渲染。改一处文案，时序自动重排。

## 技能入口（必读）

**[skills/hypit/SKILL.md](./skills/hypit/SKILL.md)** 是官方技能正文，请 Agent 在接到任何 `/hypit ...` 任务时**第一时刻读取**。该文件内嵌的执行轨迹覆盖：

- Brief → Treatment → Script → Timeline → Build 全流程的角色与产物
- 选 A-roll / 选 B-roll / 选 Caption / 选声音 / 选特效的判断口径
- 已有素材复用（Run Candidates）与失败 Build 的恢复
- 凭据（`hypit auth`）、付费边界、Studio 协作

**首次启用前必读 references 表：**

- [system.md](./skills/hypit/references/production/system.md) — 时空对象关系总纲
- [component-design.md](./skills/hypit/references/production/component-design.md) — 组件边界划分
- [distribution.md](./skills/hypit/references/environment/distribution.md) — 运行时定位与安装
- [profile.md](./skills/hypit/references/environment/profile.md) — 本机能力评估
- [project-files.md](./skills/hypit/references/creation/project-files.md) — 项目边界与笔记结构

## 参考样例库（examples 目录）

6 套完整样例，覆盖三类典型短视频形态：

| 样例 | 类型 | 形态 | 看点 |
|---|---|---|---|
| [ranking-football/](./examples/ranking-football/) | UGC 排行 | 20s 足球排名 tier list | Seedance A-roll + GPT Image 2 B-roll + WhisperX 词对齐 + 排名板 + 卡点字幕 |
| [podcast/](./examples/podcast/) | 播客片段 | 18s 对抗性播客 | 分屏访谈 + 角色感知卡拉 OK 字幕 + 道具交接 + BGM |
| [interview/](./examples/interview/) | 街头采访 | 26s 三阶段揭示 | 头部追踪 + 说话人着色字幕 + Emoji 揭示板 + 颜色闪烁 |
| [complex-explainer/](./examples/complex-explainer/) | 复杂解说 | 多场景产品解说 | 多组件联动 + Launch 系统 + 视觉语言 + Web 场景 |
| [semantic-composition/](./examples/semantic-composition/) | 语义合成 | 多场景组合演示 | Chat 场景 + 性能样式 + 响应式解说 + 声音样式 |
| [minimal-author-package/](./examples/minimal-author-package/) / [provider-package/](./examples/provider-package/) | 模板 | 组件脚手架 | 最小组件 + Provider 接入示范 |

每个样例目录都包含 `*.svml` 工作流源、`*.svrun` 执行流、`*.svs` 视觉快照、`README.md` 生产说明与 `variants.md` 变体笔记。

## 完整文档站（docs 目录）

VitePress 文档站源：[docs/](./docs/)（含中文镜像 [docs/zh/](./docs/zh/)）。覆盖快速上手、运行时、组件解剖、协议规约、Studio 协作、测试规范、Provider 接入与服务伙伴等完整开发者文档。

## 安装与运行

仓库本身**不携带运行时**。用户首次使用须在自己的项目目录执行：

```bash
npx skills add hypit-ai/hypit -g    # 安装官方发行版（CLI + 全部 packages）
hypit --version                      # 校验安装
```

Agent 在每次接到 `/hypit ...` 任务时应：

1. 先 `view_file skills/hypit/SKILL.md` 读取完整技能正文
2. 按 SKILL.md 的"环境选择"段检查本机 Profile（[profile.md](./skills/hypit/references/environment/profile.md)）
3. 按需求依次 `view_file` 读取 [references/](./skills/hypit/references/) 下对应章节

## 目录索引

| 路径 | 用途 |
|---|---|
| [skills/hypit/](./skills/hypit/) | 官方技能正文 + references/ 完整参考文档（约 30 篇） |
| [examples/](./examples/) | 6 套真实工作流样例（SVML/SVS/SVRun + 资产） |
| [docs/](./docs/) | VitePress 完整开发者文档站 |
| [bin/](./bin/) | `hypit.mjs` CLI 启动器（需配合 npm 安装使用） |
| [scripts/](./scripts/) | 上游构建与打包脚本（开发用） |
| [README.md](./README.md) / [README.zh-CN.md](./README.zh-CN.md) | 官方英文 / 中文说明 |
| [LICENSE](./LICENSE) | Apache-2.0 with conditions |

## 不在本仓库（运行时通过 npm 拉取）

- `packages/` 上游 122 个 npm 工作区包（实现层，用户安装时自动拉取）
- `services/` 本地 Python 推理（whisperx / image-opencv / yt-dlp，按需启用）
- `test/` 上游测试夹具（开发基建）
- `.github/` 上游 CI 配置
- `.claude/` `.codex/` 上游为 Claude Code / Codex 提供的本地技能安装占位（与 `skills/hypit/` 内容重复，已剔除）