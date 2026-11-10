# 本地集成记录

## 上游信息

- 仓库：<https://github.com/AIScientists-Dev/academic-humanizer>
- 集成提交：`94b88b23703bed7df507acae7d6d5876209a0cdf`
- 上游提交日期：2026-07-03
- 上游版本：0.3.3（以 `SKILL.md` frontmatter 为准）
- 许可证：MIT
- 集成日期：2026-11-10

## 本地适配

1. 将 `SKILL.md` frontmatter 中的 `description` 改为中文，以便与全局技能清单的描述逐字一致；正文内容保持不变。
2. 新增 `README.zh-CN.md`，完整翻译上游 `README.md`。命令、路径、外部链接、伦理披露和许可证边界保持不变；英文论文修改示例保留原文，以免破坏示例的学术语体语境。
3. 未纳入上游 `.gitignore`。该文件只包含 `.DS_Store`，属于上游开发环境配置，不影响技能运行。
4. 未纳入上游仓库中的 4 个社交媒体宣传素材（rednote 与 x 系列各含 PNG/SVG 版本）。这些文件未在 README 或执行入口中被引用；保留 `assets/banner.svg`，因为 README 和中文 README 都直接引用它。
5. 保留 `LICENSE`、`README.md`、`SKILL.md` 和 `examples/before-after.md`。它们分别承载许可证、使用说明、执行规则和前后对照示例。

## 已知问题

- 上游 `README.md` 的版本徽章显示 `0.3.2`，而 `SKILL.md` frontmatter 显示 `0.3.3`。本地按保留上游原文的原则未修改该徽章，实际集成版本以 `SKILL.md` 为准。
- AgentSkillsHub 基础审计结果（2026-11-10）：安全等级 `SAFE`，质量分 67，GitHub 星标 2516。该检查不替代对上游后续版本和实际使用上下文的复核。
