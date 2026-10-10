---
name: claude-mem
description: "Claude Code 记忆层（Agent Skills Hub 场景实测首选）。自动压缩并持久化每次会话到 SQLite，跨会话召回上下文；含 plugin 完整运行时、skills 子技能、Cursor/Cowork 集成与使用文档。Leading Words: Claude Code记忆, 会话持久化, 跨会话上下文, SQLite记忆层, claude mem"
metadata:
  upstream: "github.com/thedotmack/claude-mem"
---

# claude-mem

**上游仓库**：<https://github.com/thedotmack/claude-mem>

Claude Code 记忆层：自动压缩会话并持久化，跨会话召回。使用文档见 [docs/](docs/) 与 [README.md](README.md)。子技能在 [plugin/skills/](plugin/skills/)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（07_智能体框架与协同 场景实测首选）。
- 瘦身剔除：plans/ 118M 开发规划、tests/、evals/、docker、dsh、WARP.md 等；保留 src/ plugin/ docs/ 及 Cursor/Cowork 集成。
