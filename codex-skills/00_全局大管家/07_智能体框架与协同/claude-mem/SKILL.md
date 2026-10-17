---
name: claude-mem
description: "Claude Code 记忆层。自动压缩并持久化每次会话到 SQLite，跨会话召回上下文；含 plugin
  完整运行时、skills 子技能与 Cursor/Cowork 集成。Leading Words: Claude Code记忆, 会话持久化,
  跨会话上下文, SQLite记忆层, claude mem"
metadata:
  upstream: github.com/thedotmack/claude-mem
  entrypoint: managed-v2
  entrypoint_kind: application
---

<!-- codex-skills-managed-entrypoint:v2 -->
# claude-mem

Claude Code 记忆层。自动压缩并持久化每次会话到 SQLite，跨会话召回上下文；含 plugin 完整运行时、skills 子技能与 Cursor/Cowork 集成。

## 何时使用

适用任务：Claude Code 记忆层。自动压缩并持久化每次会话到 SQLite，跨会话召回上下文；含 plugin 完整运行时、skills 子技能与 Cursor/Cowork 集成。
相关检索词：Claude Code 记忆、会话记忆。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 从包管理文件和入口代码确认安装、构建、启动命令；优先运行仓库自带脚本，不自行替换成相近工具。
3. 完成任务后运行该仓库提供的测试、校验或最小可观察流程，并报告未满足的环境条件。

## 本地入口

- `README.md`
- `package.json`
- `docs/`

## 上游

- https://github.com/thedotmack/claude-mem
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
