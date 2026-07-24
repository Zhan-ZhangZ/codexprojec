---
name: Seedream-MCP
description: "豆包即梦 (Doubao-Seedream) 生图 MCP 服务。基于火山引擎 Ark API，通过 uvx 一键启动。支持文生图、图文生图、多图融合与组图输出，覆盖 5.0 Pro/Lite/4.5/4.0 多模型。Leading Words: 豆包即梦文生图, Seedream MCP生图服务, 火山引擎Ark API, 图文生图多图融合"
---

# Seedream Image MCP

豆包即梦 (Doubao-Seedream) 生图 MCP 服务。基于火山引擎 Ark API 的图像生成 MCP 工具。

## ⚠️ Golden Rules

1. **必须有 API Key**：执行前必须确认环境变量 `ARK_API_KEY` 已配置，未配置则立即拦截并提示用户前往 [火山引擎控制台](https://console.volcengine.com/) 获取。
2. **模型能力差异**：不同模型支持的能力不同，切换到 `doubao-seedream-5.0-pro` 后组图、联网搜索、流式输出不可用，尺寸仅支持 1K/2K。默认模型为 5.0 Lite，开箱即用全部能力。
3. **不擅自伪造图片**：本技能通过 MCP 工具调用远端 API 生图，不使用本地脚本、Pillow、SVG 等替代方式。

## ⚙️ Execution Trajectory

### Gate 1: 环境校验
- 确认 `ARK_API_KEY` 环境变量存在
- 确认 `uvx` 命令可用（`uv` 包管理器）
- 若缺失任一依赖，输出安装指引并停止

### Gate 2: 需求解析
- 解析用户意图：文生图 / 图文生图 / 多图融合 / 组图输出
- 确认尺寸、模型、水印等参数需求
- 对应 MCP 工具：
  - `seedream_text_to_image` — 文本生成图像
  - `seedream_image_to_image` — 图文生图 / 风格转换
  - `seedream_multi_image_to_image` — 多图融合
  - `seedream_image_group` — 组图输出

### Gate 3: 执行生图
- 调用对应 MCP 工具完成生图
- 自动保存到本地（默认开启 auto_save）
- 返回生成结果给用户

## 📝 前置阅读

执行前请先 `view_file` 阅读本目录下的 `README.md`，获取完整的命令行参数、模型能力对照表及各客户端配置示例。

## 📝 Troubleshooting

- **ARK_API_KEY 无效**：检查火山引擎控制台密钥是否过期或额度是否用尽
- **模型不支持某功能**：参照 README.md 模型能力差异表，切换到支持该功能的模型
- **uvx 命令找不到**：执行 `curl -LsSf https://astral.sh/uv/install.sh | sh` 安装 uv
