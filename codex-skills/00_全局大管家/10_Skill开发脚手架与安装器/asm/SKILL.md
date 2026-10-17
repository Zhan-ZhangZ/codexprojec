---
name: asm
description: "Agent Skills 管理器 CLI。用于安装、搜索、审计、停用和发布 Agent Skills，可统一管理 Codex、Claude Code、Cursor 等工具的本地技能目录。"
metadata:
  upstream: github.com/luongnv89/asm
  entrypoint: managed-v2
  entrypoint_kind: application
---

<!-- codex-skills-managed-entrypoint:v2 -->
# asm

`asm` 是 Agent Skills 管理器 CLI，用于跨工具查看、安装、搜索、审计、停用和发布技能。仓库还附带用于技能发现、创作、压缩和上游改进的作者技能。

## 何时使用

- 需要盘点多个 Agent 工具中已安装的技能。
- 需要从一个名称、GitHub 仓库或 registry 安装技能。
- 需要检查重复技能、上下文占用、安全风险或技能结构。
- 需要创作、压缩或向上游改进一个技能。

## 安装与使用

先读取 `README.md` 的 Getting started 和 CLI Commands 部分，确认 Node.js 版本、当前包版本与命令参数。常见流程是：

```bash
npm install -g agent-skill-manager
asm list --json
asm search "<keyword>" --json
asm inspect <skill> --json
asm audit security <source>
```

在修改用户技能目录前，先用 `asm list --json` 确认目标工具与路径；在安装或移除前，确认具体 provider、scope 和安全扫描结果。

## 作者技能

需要作者提供的具体工作流时，按任务读取下列文件，不要把测试夹具当作产品技能：

- `skills/find-me-skills/SKILL.md`：从模糊目标出发寻找可安装技能。
- `skills/skill-creator/SKILL.md`：创作、修复或评估一个技能。
- `skills/skill-shortener/SKILL.md`：通过渐进披露压缩过长的 SKILL.md。
- `skills/skill-install-improved/SKILL.md`：改造并安装一个现有技能。
- `skills/skill-upstream-pr/SKILL.md`：向技能上游提交改进建议。

## 本地入口

- `README.md`
- `package.json`
- `skills/`

## 上游

- https://github.com/luongnv89/asm

## 完成标准

完成技能盘点、安装、审计或作者工作流，并报告实际运行的命令、目标 provider/scope、验证结果和未满足的环境条件。
