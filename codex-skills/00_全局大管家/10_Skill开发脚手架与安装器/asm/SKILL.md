---
name: asm
description: "Agent Skills 管理器 CLI（Agent Skills Hub skill-management-tools 场景实测首选）。安装/更新/卸载/审计 Agent Skills，内置 37M skill-index 离线索引与依赖分析，多注册源支持。Leading Words: 技能管理器, skills安装更新, 技能审计, 离线索引, asm, agent skills manager"
metadata:
  upstream: "github.com/luongnv89/asm"
---

# asm

**上游仓库**：<https://github.com/luongnv89/asm>

Agent Skills 管理器 CLI：安装/更新/卸载/审计。可执行入口 [bin/](bin/)，源码 [src/](src/)，离线索引 [data/skill-index/](data/skill-index/)。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 瘦身剔除：治理与开发配置（COC/CONTRIBUTING/审计文档/.cursor 等）；保留 src/bin 与 37M 离线 skill-index 数据。
