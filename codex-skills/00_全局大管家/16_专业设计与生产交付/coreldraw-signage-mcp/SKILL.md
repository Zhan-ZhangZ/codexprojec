---
name: coreldraw-signage-mcp
description: CorelDRAW 门牌标识与批量设计 MCP 服务。用于在 Windows 上通过 Python COM/FastMCP 驱动 CorelDRAW，完成模板打开与填充、Excel 数据合并、条形码/二维码、图形与文字编辑、图层和色彩处理、印前检查，以及 PDF、DXF、AI、SVG、PNG 批量导出。适合门牌、标识、工程图和模板化生产文件自动化。
---

# CorelDRAW Signage MCP

这是一个 Python MCP 服务，使用 `pywin32` 连接本机已运行的 CorelDRAW，并通过 FastMCP
注册文档、图形、文字、颜色、图层、导出、印前检查和数据合并工具。英文说明见 `README.md`，
中文说明见 `README-CN.md`。

## 环境要求

- Windows 10/11。
- 64 位 Python 3.11 或更高版本，位数与 CorelDRAW 一致。
- 已安装并激活 CorelDRAW X6 或更高版本。
- 在启动服务前先启动 CorelDRAW。
- 只有运行内置 Agent 或 Streamlit 对话界面时才需要 LLM API Key；直接作为 MCP 工具服务
  使用时，工具本身不依赖 Agent 的模型配置。

## 安装

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
```

按需编辑 `.env`。MCP 传输方式、监听地址和端口由 `MCP_TRANSPORT`、`MCP_HOST`、
`MCP_PORT` 控制。

## 启动

```powershell
cd server

# stdio，供支持子进程 MCP 的客户端接入
$env:MCP_TRANSPORT = "stdio"
python server.py

# 本机 Streamable HTTP
$env:MCP_TRANSPORT = "streamable-http"
$env:MCP_HOST = "127.0.0.1"
$env:MCP_PORT = "8765"
python server.py
```

HTTP 模式的 MCP 端点为 `http://127.0.0.1:8765/mcp`。项目根的 `.mcp.json` 已给出同名
`coreldraw` 客户端的 HTTP 配置。

## 关键工具

- 文档：打开模板、新建、保存、关闭、页面与辅助线。
- 图形与文字：矩形、椭圆、线段、SVG/图片导入、布尔操作、选择、PowerClip、文字样式、
  溢出检查与转曲。
- 样式与图层：CMYK/RGB/Pantone 填色、描边、透明、渐变、RGB 合规检查和图层管理。
- 生产交付：PDF、DXF、AI、SVG、PNG、JPEG 与批量导出，以及尺寸、字体、文字溢出和颜色
  印前检查。
- 数据驱动：Excel 读取、单条/批量数据合并、条形码和二维码。

工具实现位于 `server/tools/`，注册入口是 `server/server.py`。执行具体任务前，优先读取
对应工具函数和 `server/config/template_registry.json`。

## 推荐工作流

1. 确认 CorelDRAW 已启动，服务日志显示连接成功。
2. 打开模板或新建文档，先读取当前文档、页面、图层和尺寸。
3. 用数据合并或图形/文字工具完成内容，再运行尺寸、文字溢出、缺字体和颜色检查。
4. 导出后检查输出文件存在且非空；批量任务逐个核对命名、页数和格式。
5. 服务会写入真实 CorelDRAW 文档和输出目录；覆盖已有文件或批量生成前先确认路径。

## 已知上游问题

- `requirements.txt` 与 `pyproject.toml` 没有声明 `streamlit`；使用 `server/app.py` 对话界面时
  需要另行安装。
- 仓库没有提供 README 中提到的 `server/templates/` 示例模板目录；用户需提供自己的 CDR
  模板并按需配置。
- CorelDRAW COM 仅支持 Windows。不要在本机 CorelDRAW 未启动时判断工具调用逻辑失效。

详细限制与验证记录见 `LOCAL-PATCHES.md`。
