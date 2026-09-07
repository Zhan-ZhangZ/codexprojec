---
name: blender-mcp
description: Blender 3D 建模 MCP 集成指南 (MCP for Blender)。让 AI 按双组件架构（uvx 运行的 MCP 服务器 + Blender 内 socket 插件）完成配置并接管 Blender，进行场景搭建、物体创建修改、材质灯光摄像机控制、任意 Python 代码执行与视口截图视觉自查，并直连 Poly Haven 资产库、Sketchfab/Poly Pizza 模型库与 Hyper3D Rodin/Hunyuan3D AI 生成 3D 模型，支持安全模式脚本校验与遥测开关。Leading Words: Blender 3D建模, MCP控制Blender, Blender配置指南, 场景搭建, 材质编辑, execute_blender_code, 视口截图自查, Poly Haven资产, Sketchfab模型, Poly Pizza低模, Hyper3D, Hunyuan3D, 安全模式
metadata:
  version: "1.9.1"
  upstream: "github.com/ahujasid/blender-mcp"
  upstream_commit: "c5f35d9"
---

# MCP for Blender — AI 配置控制 Blender 3D 建模

- **项目主页**: https://github.com/ahujasid/blender-mcp
- **版本基准**: v1.9.1 + 后续 Dockerfile 提交（HEAD `c5f35d9`，2026-09-05；无 tag/release，以 pyproject 版本 + commit 锚定）

## First Rule（懒加载）

执行任何配置或建模任务前，先读本地 `README.md`——uv 安装矩阵（macOS/Windows/Linux）、
各 MCP 客户端（Claude Desktop/Claude Code/Cursor/VS Code/OpenCode/Antigravity）配置样例、
免 uv 安装（pipx）、Docker 运行、环境变量全集、凭据持久化与故障排查表都在那里。
本文件只做工作流路由与关键决策点，不复述参数细节。

## 双组件架构（理解了才配得对）

1. **MCP 服务器**（`src/blender_mcp/server.py`，28 工具）— 由 `uvx blender-mcp` 从 PyPI 拉起，
   连接 Blender 侧 socket；
2. **Blender 插件**（根目录 `addon.py`，随包同步副本 `src/blender_mcp/bundled/addon.py`）—
   安装进 Blender 后在 `localhost:9876` 开 socket 服务接收并执行命令。

关键认知：服务器起服**不等于**连通——所有建模工具都要等用户在 Blender 侧
（3D 视口按 `N` → MCP for Blender 页签 → Start MCP Server）启动插件后才可用。

## 配置轨迹（状态机，逐态推进）

| 状态 | 动作 | 转移条件 | 失败出口 |
|---|---|---|---|
| S0 环境检查 | 确认 Blender ≥3.0、Python ≥3.10、是否有 uv | 三者齐备 → S2 | 缺 uv → S1 |
| S1 装 uv | 按平台官方安装器（**禁用** `pip install uv`，见 README 警告） | `uvx --version` 可用 → S2 | 装不上 → README「Install without uv」pipx 路线 |
| S2 注册客户端 | Claude Code: `claude mcp add blender uvx blender-mcp`；Claude Desktop/Cursor 等写 `mcpServers` JSON | 客户端重启后工具列表出现 28 工具 → S3 | `spawn uvx ENOENT` → 用 `which uvx` 绝对路径；Windows 包 `cmd /c` |
| S3 装插件 | `uvx blender-mcp install-addon`（自动探测 Blender 插件目录并写入，替换旧版留 `.bak`） | Blender 偏好设置能搜到 "MCP for Blender" → S4 | 探测失败 → 手动路线：`addon.py` → Edit → Preferences → Add-ons → Install… |
| S4 Blender 侧启动 | 侧边栏 `N` → MCP for Blender → 勾选所需集成 → Start MCP Server | `get_addon_status` 返回在线 → S5 | 首条命令偶发不通属上游已知现象，重试 |
| S5 建模工作流 | 进入下方执行引擎 | — | — |

**配置红线**：MCP 服务器全局**只跑一个实例**（Claude Desktop 与 Cursor 二选一）；
每步的完整命令、Windows PATH 追加、Python 版本钉住（`--python 3.11` +
`UV_PYTHON_PREFERENCE=only-managed`）等进阶参数以 `README.md` 为准。

## 核心能力（28 工具，v1.9.1）

- **场景感知**：`get_scene_info`（全场清单）/ `get_object_info`（单物体属性）/ `get_viewport_screenshot`（视口截图，AI 的眼睛）/ `get_addon_status`
- **代码执行**：`execute_blender_code` — 在 Blender 内跑任意 bpy Python（建/删/改物体、材质、灯光、摄像机、修改器、动画全靠它）
- **资产库直连**：Poly Haven（`get_polyhaven_categories` / `search_polyhaven_assets` / `download_polyhaven_asset` / `set_texture`，模型/纹理/HDRI）；Sketchfab（`search_sketchfab_models` / `get_sketchfab_model_preview` / `download_sketchfab_model`）；Poly Pizza（`search_polypizza_models` / `download_polypizza_model`，约 1.06 万免费低模，导入时自动写入 CC-BY 署名属性）
- **AI 生成 3D 模型**：Hyper3D Rodin（`generate_hyper3d_model_via_text` / `via_images` + `poll_rodin_job_status` + `import_generated_asset`）；腾讯混元 Hunyuan3D（`generate_hunyuan3d_model` + `poll_hunyuan_job_status` + `import_generated_asset_hunyuan`）
- **状态与治理**：各资产源 `*_status` 探测、`record_trajectory_feedback`、`disable_telemetry`

## 3D 建模执行引擎（感知 → 规划 → 执行 → 自查 → 迭代）

1. **感知**：`get_scene_info` 摸清现有物体/材质/灯光，必要时 `get_object_info` 深挖；
2. **规划**：把用户需求拆成小步建模序列（一步只做一件事——复杂操作不拆步会触发上游超时）；
3. **执行**：`execute_blender_code` 逐步执行 bpy 代码；素材需求交给资产工具（如"低模椅子"→ Poly Pizza 搜 CC0 → 下载归一尺寸导入）；
4. **自查**：`get_viewport_screenshot` 亲眼验证效果（构图/比例/光照），这是视觉纠错闭环的眼睛；
5. **迭代**：不对就改代码重跑，直到用户满意；建议用户在大改动前保存 `.blend`。

## Golden Rules

1. `execute_blender_code` 是**任意代码执行**——生产环境或他人机器先开安全模式 `BLENDER_MCP_SAFE_MODE=1`（校验并拦截文件读写/联网/驻留代码，建模/材质/渲染/导入导出不受影响，被拦脚本会连同原因回传供修正重试）；
2. 单实例原则：全局只运行一个 blender-mcp 服务器实例；
3. 复杂操作必拆小步，防超时；
4. 资产源 API Key 持久化只放 **Blender 插件偏好设置**（Edit → Preferences → Add-ons → MCP for Blender）或环境变量，禁止写入对话记录或工程文件；
5. 遥测默认开启——用户提出隐私要求时按 README 以 `DISABLE_TELEMETRY=true` 关闭（合规细节见 `TERMS_AND_CONDITIONS.md`）。

## 异常处理模式

| 症状 | 处置 |
|---|---|
| 工具连不通 / 无响应 | 核对三链路：Blender 侧已 Start MCP Server？客户端已配服务器？是否单实例？首条命令失败重试即通（上游已知现象） |
| `spawn uvx ENOENT` | GUI 客户端不继承终端 PATH——改用 `which uvx` 绝对路径，或 Windows 包 `cmd /c`；改完彻底重启客户端 |
| 依赖装不上 / 版本冲突 | Python 钉 3.11 + `UV_PYTHON_PREFERENCE=only-managed`；残留坏缓存先 `uv cache clean blender-mcp && uvx --refresh blender-mcp` |
| 工具超时 | 请求拆小步重发 |
| Poly Pizza 下载被 Cloudflare 拦 | 数据中心/VPN/云 IP 被 CDN 拒——换普通网络重试，或手工下载 `.glb` 走 File → Import → glTF 2.0 |
| 更多症状 | 读 `README.md` 的 Troubleshooting 表 |

## 目录导览

| 路径 | 角色 |
|---|---|
| `README.md` | 配置/安装/客户端矩阵/环境变量/排障全集（First Rule 指向） |
| `src/blender_mcp/server.py` | MCP 服务器与 28 工具实现（工具行为细节以此为准） |
| `addon.py`、`src/blender_mcp/bundled/addon.py` | Blender 插件两份刻意同步副本（sha256 一致，上游测试强制同步；根副本服务 GitHub 手动安装，bundled 副本随 PyPI 分发） |
| `src/blender_mcp/safe_mode.py` | 安全模式脚本校验器 |
| `src/blender_mcp/addon_manager.py` | 插件探测/安装/版本比对（install-addon / addon-paths） |
| `tests/`、`Dockerfile`、`TERMS_AND_CONDITIONS.md`、`assets/` | 上游测试基线、容器化运行、遥测合规文档与 UI 指引截图（随全量拉取保留，日常使用无需加载） |

## 集成说明

本集成**全量拉取**上游 main 全树（HEAD `c5f35d9`），仅排除 `.git` 与 `.gitignore`；
31 个文件 1.3M。近期上游要点：安全模式（41d98fc）、项目更名 MCP for Blender（33de875）、
Poly Pizza 集成（90f6585）、Docker 运行（c5f35d9）。
