---
name: medusa
description: "AI 代码安全扫描器（Agent Skills Hub secret-detection 场景实测首选，Pantheon Security）。六大类 45M 规则语料：密钥泄漏/注入/恶意包/提示注入/过量权限/影子 API；支持源码、IaC、依赖与 MCP 服务器扫描，MCP/Docker/CLI 多形态。Leading Words: 密钥检测, AI安全扫描, 提示注入防护, 恶意包检测, medusa, security scanner"
metadata:
  upstream: "github.com/Pantheon-Security/medusa"
---

# medusa

**上游仓库**：<https://github.com/Pantheon-Security/medusa>

AI 安全扫描器（AGPL-3.0）。规则语料 [medusa/rules/](medusa/rules/)，扫描器 [medusa/scanners/](medusa/scanners/)，用例 [examples/](examples/)，文档 [docs/](docs/)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 瘦身剔除：tests/、治理与开发配置；保留 45M 规则语料（运行核心）与扫描器源码。
