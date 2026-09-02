---
name: unslop
description: 自动化反俗套与去注水内容洗稿引擎。深度检测过度营销、刻意煽情及冗长拖沓的 AI 味文案，精准削去无用长句，还原紧凑扎实的文本信息密度。Leading Words: 去AI味文本清洗, 反冗长注水, 紧凑高信息密度提炼, 洗稿去营销感
version: 0.7.0
---

# unslop

把 LLM 输出改写成「像认真的人写的」：系统性削除 AI 腔（谄媚开场、三段排比、滥用破折号、"delve/tapestry/testament" 类套话、堆叠对冲、整齐五段式），注入节奏起伏（burstiness）与校准过的不确定性表述，同时保持技术内容零失真。支持强度分级，含反 AI 检测模式。

## 六个子技能（references/skills/）

| 子技能 | 用途 |
| --- | --- |
| [unslop](references/skills/unslop/SKILL.md) | 主技能：通用文本去 AI 味改写，强度分级 + 反检测模式 |
| [unslop-file](references/skills/unslop-file/SKILL.md) | 人话化记忆/文档文件（CLAUDE.md、todo、偏好、docs），代码块/URL/路径/命令/标题原样保留；`--deterministic` 纯正则免 API |
| [unslop-commit](references/skills/unslop-commit/SKILL.md) | 改写提交信息：去营销腔，保 Conventional Commits，主题行 ≤72 字符 |
| [unslop-review](references/skills/unslop-review/SKILL.md) | 改写代码评审评论：直给「位置 + 问题 + 具体修法」，砍掉客套铺垫 |
| [unslop-reasoning](references/skills/unslop-reasoning/SKILL.md) | 清洗推理链（CoT/扩展思考/agent 分解），针对推理文本专属的 slop 目录 |
| [unslop-help](references/skills/unslop-help/SKILL.md) | 速查卡：模式、子技能、斜杠命令一览 |

## 用法

- 触发词：`unslop`、`/unslop-help`、「去掉 AI 味」「把这段改得像人写的」
- 入门走 [references/GETTING_STARTED.md](references/GETTING_STARTED.md)；改写原则与技术依据见 [references/docs/RESEARCH_AND_TECH.md](references/docs/RESEARCH_AND_TECH.md)
- CLI 与 Python 包（`unslop` PyPI）为上游分发渠道，本库只携技能与文档层

## v0.7.0 要点（2026-08-21）

- 开发风格计量基线、可选 surprisal 遥测、SHIELD 检测器指标与 CI 安全反馈环基准打包
- 检测器反馈改为四步默认 / 六步激进阶梯；基线驱动微调仅在反检测模式启用
- Anthropic 改写与裁判运行迁移至 Claude Sonnet 5（保留 `UNSLOP_MODEL` / `UNSLOP_JUDGE_MODELS` 覆盖）
- Cursor 插件清单覆盖六个子技能；测试核心套件 639 项
- 完整历史见 [references/CHANGELOG.md](references/CHANGELOG.md)

## 参考文档索引

- [references/README.md](references/README.md) — 上游总说明
- [references/GETTING_STARTED.md](references/GETTING_STARTED.md) — 上手指南
- [references/CHANGELOG.md](references/CHANGELOG.md) — 变更史
- [references/docs/superpowers/](references/docs/superpowers/) — superpowers 集成计划文档
- [references/LICENSE](references/LICENSE) — 许可证

> 上游的 benchmarks / evals / tests / hooks / plugins、`unslop/` Python 包与 `docs/research/` 研究语料（80 篇专题备忘 + 16 篇综述）未随库分发，需要时访问 [上游仓库](https://github.com/MohamedAbdallah-14/unslop/tree/v0.7.0)。
