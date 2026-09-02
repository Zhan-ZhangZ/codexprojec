---
name: altium-designer-mcp
description: Altium Designer 元器件库智能化管理 MCP。辅助管理 AD 库中的封装、原理图符号并进行参数校验，提升硬件设计的元器件建库效率。
version: 0.2.0
---

# altium-designer-mcp — 电气与智能化设计 MCP 服务

- **项目主页**: https://github.com/embedded-society/altium-designer-mcp

## 功能说明

Altium Designer 元器件库智能化管理 MCP。辅助管理 AD 库中的封装、原理图符号并进行参数校验，提升硬件设计的元器件建库效率。

职责分界：**Agent 出智能，工具管读写**——Agent 依据数据手册/IPC-7351 等计算封装焊盘、引脚位置与符号几何（精确数值），服务器只做校验并把图元写入 `.PcbLib`/`.SchLib` 二进制格式，绝不代算几何。调用约定（单位换算、引脚几何、坐标基准）见 [docs/AGENT_GUIDE.md](./docs/AGENT_GUIDE.md)。

## 安装与快速开始

Claude Desktop 用户优先用一键扩展：release 页的 `altium-designer-mcp.mcpb`（同包 `.dxt` 兼容旧版桌面端），安装向导直接圈定库目录并以 `--allow` 授权，免配置文件。其余客户端按 [docs/CLIENT_SETUP.md](./docs/CLIENT_SETUP.md) 接入（17 家客户端已验证配置）；源码构建走 `cargo build --release`（产物 `target/release/altium-designer-mcp`）。

- 授权两种方式：命令行可重复参数 `--allow <DIR>`（可脱离配置文件独立使用），或配置文件 `allowed_paths` 白名单（示例见 [config/example-config.json](./config/example-config.json)，复制到 `~/.altium-designer-mcp/config.json`）。
- 白名单外的路径一律拒读写；另有速率限制与变更审计日志，详见 [docs/SECURITY.md](./docs/SECURITY.md)。

## 核心工具速览（服务端 34 个）

| 分类 | 工具 |
| --- | --- |
| 读写 | `read_pcblib` / `write_pcblib` / `read_schlib` / `write_schlib` |
| 查看与可视化 | `list_components` `get_component` `search_components` `component_exists` `render_footprint` `render_symbol` `extract_style` |
| 对比 | `diff_libraries` `compare_components` |
| 原位编辑 | `update_component` `update_pad` `update_primitive` `batch_update` `reorder_components` `manage_schlib_parameters` `manage_schlib_footprints` |
| 元件管理 | `delete_component` `copy_component` `rename_component` `copy_component_cross_library` `bulk_rename` |
| 库级操作 | `merge_libraries` `write_libpkg` `export_library` `import_library` `validate_library` `repair_library` `extract_step_model` |

全部 34 个工具的参数、返回结构与逐工具示例见 [docs/TOOLS.md](./docs/TOOLS.md)。

## v0.2.0 要点（0.1.0 → 0.2.0，含破坏性变更）

- **`read_pcblib`/`read_schlib` 返回组件自身 JSON 形状**：与 `write_*` 接受、`export_library` 输出的形状一致，读回即可回写（字节级复现）。
- **符号的 `text` 数组更名 `ieee_symbols`**（RECORD=3 是 IEEE 符号而非文本注记；自由文本一直走 `label` 记录）。
- **未知值一律拒绝而非静默取默认**：未知参数、未知 JSON 键、非法枚举（焊盘形状、引脚电气类型、层名拼写等）均报错并给出可接受值。
- 元件名大小写不敏感解析（与 Altium/OLE 目录一致，重名冲突拒绝）。
- IEEE 符号支持（35 种原理图装饰图元，可读写渲染）；`validate_library` 新增 3D 模型完整性检查；层名接受任意常见拼写（`Top Overlay`/`TopOverlay`/任意大小写）。
- 完整清单见 [CHANGELOG.md](./CHANGELOG.md)。

### 0.2.0 之后（上游 Unreleased，已随本技能同步）

- Claude Desktop 一键扩展（.mcpb/.dxt 双格式，官方 MCPB CLI 打包并经 schema 校验）。
- `--allow <DIR>` 命令行授权：可重复、与配置文件 `allowed_paths` 叠加、可完全脱离配置文件运行；配置文件被指名但缺失/损坏时仍然快速失败。

## 参考文档索引

- [README.md](./README.md) — 官方总览：功能、安装、工具分类表、原语类型
- [docs/TOOLS.md](./docs/TOOLS.md) — 34 个工具的完整参数与示例
- [docs/USAGE.md](./docs/USAGE.md) — 连上服务器后怎么用：典型对话工作流与预期返回
- [docs/AGENT_GUIDE.md](./docs/AGENT_GUIDE.md) — Agent 调用不变式（单位、引脚几何、上划线/多部件符号）
- [docs/AI_WORKFLOW.md](./docs/AI_WORKFLOW.md) — 从数据手册到建库的完整工作流
- [docs/PCBLIB_FORMAT.md](./docs/PCBLIB_FORMAT.md) / [docs/SCHLIB_FORMAT.md](./docs/SCHLIB_FORMAT.md) — 二进制格式逆向文档
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) / [docs/VISION.md](./docs/VISION.md) — 架构与职责分界
- [docs/errors.md](./docs/errors.md) — 错误码与处置
- [docs/SECURITY.md](./docs/SECURITY.md) — 威胁模型与安全控制
- [CHANGELOG.md](./CHANGELOG.md) — 版本历史
