---
name: rea
description: "逆向工程全能 MCP（Reverse Engineer Anything）。跨二进制/应用/运行时行为的统一逆向分析：反编译代码、版本对比、功能解释与重建指引；覆盖 native/.NET/Electron/JavaScript/打包应用/固件/浏览器目标，集成 Ghidra/apktool/adb 等分析器与被动运行时取证；npm 分发（rea-agents）。Leading Words: 逆向工程, 反编译, 二进制分析, 运行时取证, 版本对比, Ghidra, APK逆向, Electron逆向, MCP逆向"
metadata:
  upstream: "github.com/morluto/rea"
---

# REA · Reverse Engineer Anything

**上游仓库**：<https://github.com/morluto/rea>

一个 MCP 覆盖二进制、应用与运行时行为的逆向工程：看到喜欢的功能，从二进制层面搞懂它怎么实现的。

## 子技能（.agents/skills/）

| 子技能 | 路径 | 用途 |
| --- | --- | --- |
| **reverse-engineer-anything**（主技能） | [.agents/skills/reverse-engineer-anything/SKILL.md](.agents/skills/reverse-engineer-anything/SKILL.md) | 何时用 REA、证据工作流与目标类型路由；附 7 份参考文档（Android 应用/JS 应用/取证工作流/原生与产物/运行时观察/连接恢复/证据链） |
| **rea-tool-design** | [.agents/skills/rea-tool-design/SKILL.md](.agents/skills/rea-tool-design/SKILL.md) | 工具设计规范 |
| **rea-changelog-update** | [.agents/skills/rea-changelog-update/SKILL.md](.agents/skills/rea-changelog-update/SKILL.md) | 变更记录更新流程 |

## 能力范围

- **目标类型**：native 二进制、.NET、Electron/JavaScript、打包应用、固件、浏览器目标
- **分析器集成**：Ghidra、apktool、adb 等（源码在 [src/](src/)，按域分层：domain/application/browser/ghidra/process + 各目标分析器）
- **产出**：反编译代码、功能解释、版本间行为对比、重建指引
- **MCP 契约**：工具目录见 [docs/mcp-contracts.md](docs/mcp-contracts.md)

## 使用

```bash
npx rea-agents   # 或经 MCP 客户端接入；详见 README.md（22 语种）
```

## 集成说明（本库维护）

- 集成日期：2026-10-11；上游 HEAD：`6d5d71f`（2026-10-11 当日活跃）。
- 瘦身剔除（开发基建）：`.github/` 15 个 workflow、`tests/` 5.7M、`scripts/` CI/构建脚本、`website/` 宣传站、`.husky/` 与 lint/发布配置、`AGENTS.md`/`CONTRIBUTING.md`（治理）、`package-lock.json`。
- 保留 `src/` 分析器源码全量、`.agents/skills/` 三子技能、`docs/`（MCP 契约+文档）、22 语种 README 与构建必需配置（package.json/tsconfig/turbo.json/server.json）。
- 上游无根 SKILL.md，本文件为自研路由入口。
