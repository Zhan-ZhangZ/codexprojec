---
name: obsidian-vault-mcp
description: 基于 MCP 协议的 Obsidian Vault 文件检索挂载服务。专供 Open WebUI 或 Claude Desktop 穿透读取本地 Vault 笔记流。Leading Words: Obsidian MCP检索, 跨端Vault读取, 知识流提取, 本地笔记挂载
version: 1.0.0
---

# obsidian-vault-mcp

Obsidian 插件「Vault as MCP」在 Obsidian 桌面端内直接运行 MCP HTTP 服务器（Fastify，默认端口 8765），把整个 Vault 以 MCP 工具集的形式挂载给外部 LLM 端。本地 HTTP + 路径 ACL + 可选 Bearer Token 控权，不主动外发笔记数据；仅桌面端（minAppVersion 1.13.0）。

## 1.0.0 版本要点（相对本库上次集成的 0.9.x 基线）

- 中间版本 0.10.0（2026-07-30）：`read_note` 新增 `metadataOnly` 元数据视图（links / embeds / outline / frontmatter），取代已删除的 `get_linked_notes` 与内嵌展开；批量读取上限提升（25 篇）并同样支持 `metadataOnly`；移除 pre-1.13.x 设置回退
- 1.0.0（2026-08-24）：`read_note` 支持分页——按标题过滤小节、按行窗口（line-window）切片，返回未 trim 的完整小节；`patch_note` 移除 `heading` 属性、新增 0 基 `lineOffset` 消歧；监听 0.0.0.0 时支持 SSL 证书配置；`metadataOnly` 附带文件大小
- 1.0.0 后清理（2026-08-26）：README 文本与插件描述（manifest）改写，无功能变化

## 安装（Obsidian 端）

1. 社区插件商店搜 "Vault as MCP" 安装启用；或用 BRAT 添加 `https://github.com/ebullient/obsidian-vault-mcp`
2. 手动：从 Releases 下载解压到 Vault 的 `.obsidian/plugins/vault-as-mcp/` 后重载并启用
3. 状态栏点击开停服务器，或命令面板 Start/Stop/Restart MCP server；设置里可开自启

## 客户端挂载

- Open WebUI：MCP 服务地址填 `http://localhost:8765/mcp`（远程经 Tailscale/局域网换机器 IP）
- Claude Code：`claude mcp add -t http -s local Obsidian http://localhost:8765/mcp -H "Authorization: Bearer <token>"`
- Claude Desktop（stdio 传输）：从 Releases 下载 `mcp-bridge.js` 桥接 stdio 到 HTTP，`VAULT_MCP_URL` 指向上述地址（源码在仓库 bridge 分支）

## MCP 工具速览（12 个）

`read_note`（标题过滤 / 行窗口 / metadataOnly）· `read_multiple_notes`（≤25 篇）· `search_notes`（folder / tag / frontmatter / 修改时间 / 全文）· `list_notes`（非递归）· `create_note`（可带模板）· `append_to_note`（文末或指定标题后）· `update_note`（整篇替换）· `patch_note`（`old_text`/`new_text` 精确替换，`lineOffset` 消歧）· `delete_note`（进系统回收站）· `rename_note`（移动并重写反链）· `read_periodic_note` · `list_templates`。

参数名、类型与行为以 `src/vaultasmcp-Tools.ts` 及运行时 `tools/list` 为真源。

## 安全模型

- 服务器只监听本机（默认），不向外部 LLM 服务发送 Vault 数据
- Bearer Token 可选认证（跨网访问强烈建议开启）
- 路径 ACL 限定外部工具可读写的 Vault 子树
- 漏洞披露渠道见 [SECURITY.md](SECURITY.md)

## 库内资产与瘦身说明

保留：[README.md](README.md)（安装/挂载/工具细节）、[CHANGELOG.md](CHANGELOG.md)、[SECURITY.md](SECURITY.md)、LICENSE、manifest.json / manifest-beta.json / versions.json（插件身份与版本元数据）、src/ 全量 TypeScript 源码。

剔除（开发基建，需要时看上游）：test/ 测试套件、package.json / package-lock.json、esbuild / biome / eslint / tsconfig / vitest 配置、.github/ CI、CONTRIBUTING.md 与 CLAUDE.md 开发指南（已改指上游 GitHub 1.0.0 tag 链接）。

上游：<https://github.com/ebullient/obsidian-vault-mcp>
