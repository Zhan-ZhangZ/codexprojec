# adobe-mcp

[English README](README.md) | 简体中文

面向 Adobe 应用的 MCP 服务集合。可以按应用单独安装，也可以安装套件，用一个服务覆盖多个应用并使用跨应用工具。

InDesign 服务在 2.3.0 之前发布为 `indesign-mcp-server`，现名 `adobe-mcp-indesign`，工具保持一致；更新客户端配置时只需替换包名。

| 包 | 驱动应用与能力 | npm |
|---|---|---|
| [adobe-mcp-indesign](packages/indesign) | InDesign：文档、页面、文字、样式、表格、书籍、PDF 与 EPUB 导出，约 423 个工具 | [`adobe-mcp-indesign`](https://www.npmjs.com/package/adobe-mcp-indesign) |
| [adobe-mcp-illustrator](packages/illustrator) | Illustrator：文档、画板、图层、形状与路径、文字、颜色与色板、特效与 3D、符号、图案、图像描摹、链接、变量、动作、导出、印前与打印，约 308 个工具 | `adobe-mcp-illustrator` |
| [adobe-mcp-photoshop](packages/photoshop) | Photoshop：文档与格式、图像和画布、图层、蒙版、智能对象与图层样式、选区、调整与填充、滤镜、绘画与修饰、文字、视频时间线、动作、画板、导出与打印，约 205 个工具 | `adobe-mcp-photoshop` |
| [adobe-mcp-aftereffects](packages/aftereffects) | After Effects：项目与素材、合成、图层、关键帧与表达式、特效、文字动画、蒙版、形状、3D、跟踪、颜色、渲染队列与 Essential Graphics，约 164 个工具 | `adobe-mcp-aftereffects` |
| [adobe-mcp-premiere](packages/premiere) | Premiere Pro：项目与素材箱、序列、时间线、标记、特效、关键帧、转场、转录、元数据与导出，约 96 个工具；尚未在真实 Premiere Pro 中验证 | `adobe-mcp-premiere` |
| [adobe-mcp-suite](packages/suite) | InDesign、Illustrator、Photoshop、After Effects 与 Premiere Pro 的统一服务，并提供跨应用工具 | `adobe-mcp-suite` |

每个服务都运行在安装 Adobe 应用的同一台机器，并通过应用自带的 ExtendScript 接口通信。Premiere Pro 没有外部 ExtendScript 入口，因此通过应用内 UXP 插件连接。支持 macOS 与 Windows。

## 安装单个应用

Claude Code：

```bash
claude mcp add indesign -- npx -y adobe-mcp-indesign
```

```bash
claude mcp add illustrator -- npx -y adobe-mcp-illustrator
```

任何支持 `mcpServers` 配置的客户端：

```json
{
  "mcpServers": {
    "indesign": { "command": "npx", "args": ["-y", "adobe-mcp-indesign"] },
    "illustrator": { "command": "npx", "args": ["-y", "adobe-mcp-illustrator"] }
  }
}
```

## 安装整套 Adobe 服务

```bash
claude mcp add adobe -- npx -y adobe-mcp-suite
```

套件按应用给工具加前缀（如 `indesign_…`、`illustrator_…`），并包含跨应用工具。可以用 `--apps indesign` 或环境变量 `ADOBE_MCP_APPS` 只加载部分应用。

各应用的工具、约定和配置见对应包 README。本包不包含 npm 服务源码；如需开发或检查实现，请使用[上游源码仓库](https://github.com/zachshallbetter/adobe-mcp/tree/bd855b746b1ac3a64011bbc92bdf5fd9320fade3)。

## 使用前

- 安装 Node.js 18+。
- 启动目标 Adobe 应用。
- 首次在 macOS 上调用时，确认“隐私与安全性 → 自动化”授权。
- 先用 `tools/list` 检查当前运行时工具，不要假定所有版本的参数完全一致。
- 批量修改、删除、关闭未保存文件和跨应用写回前，先保存工程或版本。

## 许可证

MIT。各应用包的额外声明见 `packages/<应用>/LICENSE` 或 `NOTICE`。
