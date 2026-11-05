# 本地集成记录

- 上游仓库：https://github.com/Wentao220/ozon-university-skill
- 集成提交：`e76c62e0f0879e9b23464eae69bd3284d14eb020`
- 集成日期：2026-10-28

## 目录适配

- 将上游 `skills/ozon-university/` 扁平化到本技能根目录，保证 MCP 可以直接发现根入口 `SKILL.md`。
- 保留作者原始 `SKILL.md` 正文、`agents/` 和全部 `references/`。
- 保留中文 `README.md` 与 MIT `LICENSE`，仅补充本仓库集成版安装路径并更新目录结构说明。

## 未纳入发布技能

- `.github/`：上游校验工作流，仅服务开发流程。
- `tests/`：前向测试问题清单，属于开发验证材料。
- `docs/plans/`：公开版设计记录，不参与运行时加载。
- `scripts/`：发布打包和 Skill 格式校验脚本，不属于 Agent 执行链路。
- `.gitignore`：嵌套仓库配置，按源仓库规则删除。

## 已知边界

- 内置研究资料最后核验日期为 2026-07-22；涉及费率、政策、物流、类目限制和广告规则时应按 `SKILL.md` 要求重新核验 Ozon 官方来源。
