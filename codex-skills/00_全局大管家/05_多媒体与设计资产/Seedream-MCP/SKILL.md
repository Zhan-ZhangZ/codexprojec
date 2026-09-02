---
name: Seedream-MCP
description: "豆包即梦 (Doubao-Seedream) 生图 MCP 服务。基于火山引擎 Ark API，通过 uvx 一键启动。支持文生图、图文生图、多图融合与组图输出，覆盖 5.0 Pro/Lite/4.5/4.0 多模型。Leading Words: 豆包即梦文生图, Seedream MCP生图服务, 火山引擎Ark API, 图文生图多图融合"
version: 3.0.2
---

# Seedream Image MCP

豆包即梦 (Doubao-Seedream) 生图 MCP 服务。基于火山引擎 Ark API 的图像生成 MCP 工具，PyPI 包名 `seedream-image-mcp`，本技能对应上游 v3.0.2（分发形态为 PyPI/uvx，本地仅保留文档层）。

## ⚠️ Golden Rules

1. **必须有 API Key**：执行前必须确认环境变量 `ARK_API_KEY` 已配置，未配置则立即拦截并提示用户前往 [火山引擎控制台](https://console.volcengine.com/) 获取。
2. **模型由服务端启动配置固定**：生效模型在服务启动时以 `--model` 选定（默认 `doubao-seedream-5.0`，与 5.0 Lite 等价，开箱即用全部能力），单次工具调用不可切换模型；不确定当前配置时先读 MCP 资源 `seedream://server/info`。
3. **模型能力差异**：服务配置为 `doubao-seedream-5.0-pro` 时，组图、联网搜索、流式输出不可用，尺寸档位仅 1K/1.5K/2K，参考图上限降为 10 张；Pro 独享图层拆分（1 张底图 + 至多 16 张透明 PNG 图层）与透明背景。权威能力数据以资源 `seedream://models/info` 为准，不凭记忆复述数值。
4. **不擅自伪造图片**：本技能通过 MCP 工具调用远端 API 生图，不使用本地脚本、Pillow、SVG 等替代方式。

## ⚙️ Execution Trajectory

### Gate 1: 环境校验
- 确认 `ARK_API_KEY` 环境变量存在
- 确认 `uvx` 命令可用（`uv` 包管理器）
- 若缺失任一依赖，输出安装指引并停止

### Gate 2: 需求解析
- 解析用户意图，对应 MCP 工具（上游 v3.0 起工具名不再带 `seedream_` 前缀）：
  - `text_to_image` — 文本生成图像
  - `image_to_image` — 图文生图 / 风格转换 / 编辑；`layer_decomposition` 图层拆分与 `background=transparent` 透明背景仅 5.0 Pro
  - `multi_image_fusion` — 多图融合（2-14 张参考图，Pro 上限 10 张）
  - `sequential_generation` — 组图输出（5.0 Pro 不支持；参考图数量 + 生成数量 ≤ 15）
  - `browse_images` — 浏览工作区已保存图片（只读、幂等、不访问网络）
- 确认尺寸、水印等参数：尺寸为档位 `1K`/`1.5K`/`2K`/`3K`/`4K` 或 `宽x高` 像素，需与所选模型兼容（MCP 默认 `2K` 即 2048x2048）
- 提示词建议不超过 300 个汉字或 600 个英文单词；`fast` 档提示词优化仅 5.0 Pro 与 4.0 支持；联网搜索 `tools=[{"type":"web_search"}]` 仅 5.0 / 5.0-lite 系列

### Gate 3: 执行生图
- 调用对应 MCP 工具完成生图；auto_save 默认开启，文件自动落盘 `<工作区根>/.seedream/images/<日期>/<工具名>/`
- API 返回的图片 URL 仅保留 24 小时，跨轮引用历史图片一律使用本地保存路径（先 `browse_images` 定位再作为 `image` 参数回流）
- 返回生成结果给用户

## 📐 模型能力速查

| 能力 / 参数                | 5.0 Pro        | 5.0 / 5.0 Lite | 4.5       | 4.0          |
| -------------------------- | -------------- | -------------- | --------- | ------------ |
| 文生图 / 图生图 / 多图生图 | ✅             | ✅             | ✅        | ✅           |
| 组图生成                   | ❌             | ✅             | ✅        | ✅           |
| 联网搜索                   | ❌             | ✅             | ❌        | ❌           |
| 流式输出                   | ❌             | ✅             | ✅        | ✅           |
| 输出格式（png/jpeg）       | ✅             | ✅             | ❌        | ❌           |
| 图层拆分 / 透明背景        | ✅             | ❌             | ❌        | ❌           |
| 分辨率档位                 | 1K / 1.5K / 2K | 2K / 3K / 4K   | 2K / 4K   | 1K / 2K / 4K |
| 参考图上限                 | 10 张          | 14 张          | 14 张     | 14 张        |

## 🚀 启动与挂载

```bash
# stdio（Claude Desktop / Cursor / Cline 等客户端默认）
ARK_API_KEY=your_api_key_here uvx seedream-image-mcp

# 指定模型与默认尺寸
ARK_API_KEY=your_api_key_here uvx seedream-image-mcp --model doubao-seedream-5.0-pro --default-size 2K

# streamable-http + Web 操作台（浏览器访问 http://127.0.0.1:8000/web，默认关闭）
ARK_API_KEY=your_api_key_here uvx seedream-image-mcp --transport streamable-http --web --auth-token your_token_here
```

- Claude Desktop 配置示例见 [references/claude_desktop_config.json](references/claude_desktop_config.json)；Claude Code / Cursor / Cline 配置片段见 [references/README.md](references/README.md)
- 全量启动参数与环境变量见 [references/README.md](references/README.md) 与 [references/.env.example](references/.env.example)
- 安全红线：非回环地址绑定（含 `localhost`）必须配置 Bearer 令牌与 TLS，否则服务拒绝启动；生产部署用环境变量传密钥，不写入命令行

## 📝 前置阅读

- [references/README.md](references/README.md) — 全量启动参数、五工具参数表、模型能力对照、客户端配置、环境变量与部署注意事项
- [references/workflows.md](references/workflows.md) — 多步工作流：连环画/故事书端到端、图层拆分与再合成、风格一致性迭代
- [references/troubleshooting.md](references/troubleshooting.md) — 错误码对策（400/401/402/403/413/429/5xx）、常见失败模式、输入与配额约束
- [references/Seedream-API-Reference.md](references/Seedream-API-Reference.md) — 火山引擎 Seedream API 参考
- [references/Seedream-Official-Tutorial.md](references/Seedream-Official-Tutorial.md) — 官方生图教程
- [references/Seedream-Streaming-Response.md](references/Seedream-Streaming-Response.md) — 流式响应机制说明

## 📝 Troubleshooting

- **ARK_API_KEY 无效**：检查火山引擎控制台密钥是否过期或额度是否用尽（402 为余额不足、403 为模型未开通权限、429 为频率超限，逐条对策见 [references/troubleshooting.md](references/troubleshooting.md)）
- **模型不支持某功能**：参照上方能力速查表或读资源 `seedream://models/info`；需要换能力面时由部署方改启动参数 `--model`
- **引用的历史图失效**：API URL 仅 24 小时有效，改用 `browse_images` 定位本地保存路径
- **生成成功但找不到文件**：确认 auto_save 未被显式关闭，按 `<工作区根>/.seedream/images/<日期>/<工具名>/` 查找；保存目录默认 30 天清理、10GB 上限，重要图片另行归档
- **uvx 命令找不到**：执行 `curl -LsSf https://astral.sh/uv/install.sh | sh` 安装 uv
