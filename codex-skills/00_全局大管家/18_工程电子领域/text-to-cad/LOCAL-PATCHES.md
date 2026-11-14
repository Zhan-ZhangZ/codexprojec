# 本地集成记录

## v0.11.10

- 上游：`earthtojake/text-to-cad`
- 版本：`v0.11.10`
- 提交：`337ac4e3c820d37b14eff30f337f82fbf75343c6`
- 集成日期：2026-11-14

## 保留

- 根 `README.md`、`LICENSE`、`VERSION`。
- 8 个子技能：`cad`、`engineering-drawing`、`fea`、`pcb`、`print3d`、`render`、`robot-simulation`、`sendcutsend`。
- 所有子技能的 `SKILL.md`、`references/**`、`agents/openai.yaml`、`LICENSE`。
- `print3d/scripts/orca_presets.py`，该脚本属于打印切片运行链路。
- 各 Agent 插件清单与 MCP 配置：`.claude-plugin/`、`.codex-plugin/`、`.cursor-plugin/`、`.grok-plugin/`、`plugin.json`、`mcp.json`、`codex.mcp.json`、`claude.mcp.json`、`cursor.mcp.json`、`gemini-extension.json`、`skills.sh.json`。
- 用户安装说明 `docs/install.md`。
- 新增中文入口说明 `README.zh-CN.md`；根 `SKILL.md` 继续作为本技能库的单入口薄路由。

## 裁剪

删除上游开发与构建资产：`apps/`、`packages/`、`models/`、`tests/`、`scripts/`、`.github/`、`.githooks/`、`AGENTS.md`、`CONTRIBUTING.md`、`SECURITY.md`、`requirements-dev.txt`、`package.json`、`package-lock.json`、`.gitignore`。

判断依据：Agent 执行技能所需的模型契约、格式规则和工作流都在 `skills/*/references/**`；实际 CAD/PCB/FEA/切片/渲染/MCP 工具从 PyPI 安装，不依赖本仓库内的开发源码。上游开发测试、示例模型、网站和构建脚本不作为运行时输入。

## 链接适配

- 根 README 的仓库标志图改为固定提交 URL。
- README 中已裁剪的 `SECURITY.md`、`CONTRIBUTING.md`、`AGENTS.md` 改为固定提交 URL。
- `docs/install.md` 中迁移指南的相对链接改为固定提交 URL。
- 所有子技能内部相对引用保持上游原文，未改写。

## 验证

- 子技能入口：8。
- Agent references：53。
- Agent manifests：8。
- 运行时脚本：1。
- 基础复制文件 96；加入根 `SKILL.md`、`README.zh-CN.md` 与本地记录后共 99 文件，约 1 MB。
- 无 symlink。
