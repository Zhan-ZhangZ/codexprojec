---
name: openscad-mcp
description: OpenSCAD 纯代码驱动参数化 3D 建模与视觉纠错闭环引擎 (MCP)。极大发挥大模型的代码生成优势，通过自动后台编译输出 PNG 预览图，实现生成、渲染、视觉验证及自动纠错迭代的全链路覆盖。Leading Words: OpenSCAD代码3D建模, 纯代码参数化渲染, 视觉验证纠错闭环, PNG预览图生成
metadata:
  version: 0.3.0
  upstream: github.com/quellant/openscad-mcp
---

# OpenSCAD MCP — 代码驱动的 3D 建模闭环

- **项目主页**: https://github.com/quellant/openscad-mcp

## 功能说明

`openscad-mcp` 是目前被社区公认的最契合 LLM 调性的 CAD MCP 服务器之一。因为 OpenSCAD 本质上是一门用于 3D 建模的编程语言，大模型非常擅长写代码；而这个服务器补齐了最后一块拼图——为 AI 提供了“眼睛”，让 AI 能够直接将生成的代码渲染为图片并审查，形成自我纠错的工程闭环。

### 适用软件
- OpenSCAD

### 核心能力（16 工具，v0.3.0）
- **参数化建模执行**：将自然语言转化为 OpenSCAD 脚本。
- **高保真渲染与预览反馈**：`render_single` / `render_perspectives` / `compare_renders` 在后台运行渲染引擎生成 PNG。自 v0.3.0 起渲染结果以 MCP `ImageContent` 图片块直接返回，客户端（如 Claude Desktop）内原生显示——AI 代理可以直接“看”到模型的样子（旧版的 base64 字典返回与 `output_format` 参数已移除）。
- **模型 CRUD 与多格式导出**：`create_model` / `get_model` / `update_model` / `list_models` / `delete_model` 管理工作区 `.scad` 文件；`export_model` 导出 STL / 3MF / AMF / OFF / DXF / SVG。
- **分析与校验**：`validate_scad` 免渲染语法检查（v0.3.0 修复：此前所有输入都误报 `valid: false`，且现已支持 2D 模型）；`analyze_model` 计算包围盒/尺寸/三角面数；`get_libraries` / `check_openscad` 检查环境。
- **项目依赖图谱**：`get_project_files` 列出 `.scad` 文件及其 `include`/`use` 依赖；`include_paths` 自 v0.3.0 起经 `OPENSCADPATH` 环境变量传入（修复：原 `-I` 参数在 OpenSCAD 中不存在导致该功能完全失效）；`clear_cache` 清渲染缓存。
- **零配置环境**：官方推荐通过 `uv` 运行（`uv run --with git+https://github.com/quellant/openscad-mcp.git openscad-mcp`），实现无需复杂系统配置即可一键起服的“零安装”体验；服务器运行时由 uv 从上游仓库直接拉取，无需本地源码。

### 安全边界（v0.3.0 加固）
- `allowed_paths` 路径包容性校验改用 `Path.is_relative_to`（修复：旧版按字符串前缀判断，放行 `/srv/project` 时连带放行 `/srv/project-secrets` 等同级路径；现同时阻断 `..` 穿越与符号链接逃逸）。

## 使用条件

- 操作系统不限。
- 系统中需安装 OpenSCAD 并在环境变量中暴露其命令行接口（不在 PATH 时设 `OPENSCAD_PATH`）。
- 需 `uv`（推荐）或 Python 3.10+。

## 典型工作流

1. **构思**：用户描述需求：“写一个 M3 螺母固定支架的参数化模型。”
2. **生成**：AI 编写 OpenSCAD 代码（可先 `validate_scad` 校验语法，免渲染快速试错）。
3. **渲染验证**：AI 通过此 MCP 服务渲染代码，直接获取预览图片（`ImageContent`）。
4. **纠错迭代**：如果 AI（或用户）看到图片觉得孔位不对，AI 会直接修改代码，再次渲染，直到输出完美的 STL 模型文件供 3D 打印机使用。

## 详细指南

关于 `claude mcp add` 一键安装、Claude Desktop / Cursor 的 `claude_desktop_config.json` 配置样例、全部工具参数表与环境变量清单，请参考本地代码库中的 `README.md`；工具级协议细节见 `API.md`；版本行为变化（含 v0.3.0 破坏性变更）见 `CHANGELOG.md`。
