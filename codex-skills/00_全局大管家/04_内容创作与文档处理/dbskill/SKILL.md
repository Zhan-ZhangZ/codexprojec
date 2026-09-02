---
name: dbskill
description: 中文自媒体爆款选题与标题诊断剖析专家。专精于小红书标题、商业短图文表达、开篇 Hook 设计及爆款对标拆解。Leading Words: 自媒体爆款拆解, 小红书标题诊断, 商业内容表达, 流量选题剖析
version: 2.18.39
---

# dbskill

`dontbesilent` 商业工具箱：从 16,152 条推文提炼 4,176 个知识原子，沉淀为 **31 个正式 Skill + 1 个系统更新入口（`/dbs-update`）**。用户要做内容诊断、商业判断、选题拆解、小红书标题、Hook 优化，或第一次使用不知道选哪个能力时触发。

## 统一入口（优先读这个）

- **[skills/dbs/SKILL.md](skills/dbs/SKILL.md)** — 主入口路由：新手教程 + 单任务动态编排（1 主 Skill + 最多 2 辅助），内置版本检查约定
- [docs/新手入门.md](docs/新手入门.md) — 官方上手手册
- [README.md](README.md) — 上游总说明（安装矩阵/能力一览/推文集导航）

## 能力地图（按任务类型）

| 任务 | 命令 | 交付 |
|---|---|---|
| 商业诊断/风险/定价 | `/dbs-diagnosis` | 判断与验证方案 |
| 对标研究 | `/dbs-benchmark` | 对标筛选与研究框架 |
| 理论锚点与历史同构答案 | `/dbs-standard-answer` | 案例矩阵与失效边界 |
| 选题/内容/标题/短视频 | `/dbs-content`、`/dbs-hook`、`/dbs-xhs-title` | 可发布文案 |
| 短视频数据与语音稿提取 | `/dbs-video-extract` | 数据与归档文字稿 |
| 发布前敏感词/导流检查 | `/dbs-content-risk-check` | 最小修改动作 |
| 文稿共鸣/逻辑/传播 | `/dbs-resonate`、`/dbs-script-flow`、`/dbs-spread` | 修改意见与优先级 |
| 概念/目标/提问澄清 | `/dbs-deconstruct`、`/dbs-goal`、`/dbs-good-question` | 可验证定义与行动目标 |
| 拖延与行动受阻 | `/dbs-action` | 卡点分析与下一步 |
| 决策记录与复盘 | `/dbs-decision`、`/dbs-save`、`/dbs-restore`、`/dbs-report` | 本地决策档案（`~/.dbs/`） |
| 文件夹知识库治理 | `/dbs-knowledge` | 导航/版本规则/健康检查 |
| 内容资产工程与多端工作台 | `/dbs-content-system`、`/dbs-agent-migration`、`/dbs-install-skill` | 本地工程与安装方案 |
| 把反复问题做成 Skill | `/dbs-skill-maker` | 可安装 Skill |

另有学习与思辨组（`dbs-learning`、`dbs-jtbd`、`dbs-chatroom`、`dbs-chatroom-austrian`、`dbs-wechat-html` 等），完整清单见 [README.md](README.md)「能力一览」。

## 知识资产

- [知识库/](知识库/) — Skill 知识包（方法论/诊断框架/案例库）+ 原子库（`atoms.jsonl` 2.6M 与季度分卷）+ 高频概念词典
- [books/dontbesilent-开源推文集.md](books/dontbesilent-开源推文集.md) — 全部源推文的 Markdown 汇编（PDF 版见上游仓库）

## v2.18.39 要点（2026-09-02）

- Windows 安装改用目录 Junction，避免多端 Skill 被复制成多个实体目录
- 自 v2.14.2 以来的主要增量：`dbs-video-extract`（TikHub 数据提取）、`dbs-content-risk-check`（发布前风控）、`dbs-standard-answer`（理论锚点）、`dbs-content-system`（内容资产工程）、知识原子 3,071→4,176、正式 Skill 21→31
- 完整历史见 [UPDATE.json](UPDATE.json) 与 [GitHub Releases](https://github.com/dontbesilent2025/dbskill/releases)

> 上游按「整仓即插件」分发（`.claude-plugin/` 市场清单）；仓库根的 CI（`.github/`）、构建与测试（`tools/`、`scripts/`）、`site/` 落地页、8.5M 推文集 PDF 未随库分发（PDF 与 Markdown 版内容重复），需要时访问 [上游仓库](https://github.com/dontbesilent2025/dbskill)。
