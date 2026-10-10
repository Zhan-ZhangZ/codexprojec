---
name: anti-slop
description: "反 AI 味多面规则系统（miqdadbadjuber 版，4.5k★，Agent Skills Hub 实测 4/5）：核心规则文件 + 6 个按关注点拆分的子技能——antislop 总纲（默认常载过滤）、antislop-code 代码、antislop-copywriting 文案、antislop-human 文风（含 contrast-check.py 对比检查脚本）、antislop-layoutmobile 移动端布局、antislop-ui 界面设计；另配 rules/antislop.md 规则单文件版与 cli/ 安装器，多平台插件入口（Claude/Codex/Cursor/Cline/Kimi 等）。Leading Words: 反AI味, AI腔规则, 代码去AI味, 文案去AI味, UI设计反平庸, 移动端布局检查, 规则过滤器"
metadata:
  upstream: "github.com/miqdadbadjuber/anti-slop"
---

# anti-slop · Anti Slop Rules System

**上游仓库**：<https://github.com/miqdadbadjuber/anti-slop>

一个「核心规则 + 按关注点拆分子技能」的反 AI 味系统。核心文件 `antislop.md`（等价规则单文件版在 [rules/antislop.md](rules/antislop.md)）定义总纲与两种使用模式（全局偏好/会话覆盖）；按需加载子技能：

| 子技能 | 路径 | 关注点 |
| --- | --- | --- |
| **antislop**（总纲） | [skills/antislop/SKILL.md](skills/antislop/SKILL.md) | 核心过滤器，默认常载，含首跑安装向导 |
| **antislop-code** | [skills/antislop-code/SKILL.md](skills/antislop-code/SKILL.md) | 代码层 AI 味规则 |
| **antislop-copywriting** | [skills/antislop-copywriting/SKILL.md](skills/antislop-copywriting/SKILL.md) | 文案层规则 |
| **antislop-human** | [skills/antislop-human/SKILL.md](skills/antislop-human/SKILL.md) | 文风层，附 contrast-check.py / contrast-mcp.py 对比检查 |
| **antislop-layoutmobile** | [skills/antislop-layoutmobile/SKILL.md](skills/antislop-layoutmobile/SKILL.md) | 移动端布局规则 |
| **antislop-ui** | [skills/antislop-ui/SKILL.md](skills/antislop-ui/SKILL.md) | 界面设计反平庸规则 |

## 使用说明

- 详细指南见 [GUIDE.md](GUIDE.md)；`cli/` 为 Node 安装器（package.json 入口），多平台插件清单在根目录各 `.*-plugin/` 与 `plugin.json`。
- 上游设计为「总纲常载 + 子技能按需」，与大管家路由模型一致：按任务领域加载对应子技能即可。

## 集成说明（本库维护）

- 集成日期：2026-10-10；上游 HEAD：`388cbe3`（2026-10-05）；Agent Skills Hub 2026-10-07 实测 Reads human 4/5、移除 1 项结构特征、事实全保。
- 瘦身剔除（治理/CI）：`CODE_OF_CONDUCT.md`、`CONTRIBUTING.md`、`scripts/`（CI 检查器）、`.github/` 全部；README/GUIDE 对上述文件的引用为叙述性提及，保留原貌（共 4 处）。
- 保留 `skills/` 6 子技能全量、`rules/`、`cli/` 安装器、`assets/` 配图、ROADMAP/SECURITY 与全部多平台插件入口。
