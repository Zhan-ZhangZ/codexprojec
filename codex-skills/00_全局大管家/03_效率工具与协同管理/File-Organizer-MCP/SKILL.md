---
name: File-Organizer-MCP
description: 基于 MCP 协议的本地文件自动化整理服务器。支持 Claude、Cursor、Gemini CLI 等多端挂载，提供跨系统的文件搬运、分类和重命名底层工具支持。Leading Words: MCP文件整理服务, 跨端MCP挂载, 目录自动化重构, 文件分类API
version: 5.0.0
---

# File Organizer MCP

一个把「整理文件」变成单次原子调用的 MCP 服务器：让 Agent 用一次 `organize_files()` 完成分类、搬运、去重与重命名，替代数十次 `read`/`write`/`rename` 的链式调用——省 token、少出错、可回滚（`file_organizer_undo_last_operation`）。

## 安装挂载

npm 包 `file-organizer-mcp`（Node.js 18+），stdio 传输：

```json
{
  "mcpServers": {
    "file-organizer": {
      "command": "npx",
      "args": ["-y", "file-organizer-mcp"]
    }
  }
}
```

Cursor / Windsurf / Zed / Jan / LM Studio / Open WebUI 的现成配置片段见 [references/examples/mcp-clients/](references/examples/mcp-clients/)。

## 核心工具速览（服务端 22 个）

| 工具 | 用途 |
| --- | --- |
| `file_organizer_organize_files` | 一次调用完成整套移动，原子且可回滚 |
| `file_organizer_preview_organization` | 预演整理结果，不落盘 |
| `file_organizer_scan_directory` / `list_files` | 带详细元数据的目录扫描 |
| `file_organizer_read_file` / `batch_read_files` | 8 层路径校验的安全读取 |
| `file_organizer_batch_rename` | 按模式 / 正则 / 序号批量重命名 |
| `file_organizer_organize_by_project` | v5 新增：按项目聚合跨类型文件（稀有词共名 + IDF 内容词 + 标识符标记，纯本地判定） |
| `file_organizer_organize_music` / `organize_photos` | 按音乐元数据 / 照片 EXIF 归档 |
| `file_organizer_find_duplicate_files` / `analyze_duplicates` / `delete_duplicates` | 查重与分析 |
| `file_organizer_smart_suggest` | 整理建议 |
| `file_organizer_undo_last_operation` / `view_history` | 回滚与历史 |

完整参数与返回结构见 [references/API.md](references/API.md)。

## v5.0.0 要点

- **无状态 MCP 协议（2026-07-28 规范）**：无会话握手、无 `Mcp-Session-Id`，`server/discover` 协商能力；同时兼容 2025 旧握手（双时代自动协商）。
- **调度器独立成进程**：定时整理改由 `file-organizer-watch` 独立 bin 管理（`add`/`remove`/`list`，守护模式），MCP 服务保持无状态。
- **内容类工具已删除**：`organize_smart`、`organize_by_content`、`screen_files` 及 PDF/DOCX 文本抽取已移除；文本预览为原始读取。
- 从 v3.x 迁移参见 [references/MIGRATION.md](references/MIGRATION.md)。

## 安全模型（默认收敛）

- 白名单目录准入：默认放行 Desktop/Documents/Downloads 等用户目录，其余需在配置中显式添加。
- 系统目录永久封禁（Windows 的 `C:\Windows`、macOS 的 `/System`、Linux 的 `/etc` 等），配置加了也无效。
- `node_modules`、`.git`、`dist` 等目录全平台阻断。
- 三档现成配置示例：[references/examples/config.example.json](references/examples/config.example.json)（标准）、[config.sandboxed.json](references/examples/config.sandboxed.json)（沙箱）、[config.strict.json](references/examples/config.strict.json)（严格）；字段定义见 [references/config.schema.json](references/config.schema.json)。

## 参考文档索引

- [references/README.md](references/README.md) — 官方说明：功能总览、快速开始、文件类别、故障排查
- [references/API.md](references/API.md) — 全部 22 个工具的参数与返回结构
- [references/ARCHITECTURE.md](references/ARCHITECTURE.md) — 分层架构与协议双时代实现
- [references/CHANGELOG.md](references/CHANGELOG.md) — 版本历史（含 v5 破坏性变更明细）
- [references/MIGRATION.md](references/MIGRATION.md) — 跨大版本迁移指南
- [references/SECURITY.md](references/SECURITY.md) — 安全设计与威胁模型
