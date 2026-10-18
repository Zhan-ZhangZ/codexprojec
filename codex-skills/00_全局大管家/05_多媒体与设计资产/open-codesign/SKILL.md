---
name: open-codesign
description: 开源本机 AI 设计桌面应用（Claude Design 替代品）：用自有 API Key 或 ChatGPT 登录连接 Claude/GPT/Gemini 等模型，把提示词生成原型、幻灯片与营销资产；支持本地工作区、沙箱预览、导出、设计系统与源代码编辑。
---

# Open CoDesign

本目录是 [OpenCoworkAI/open-codesign] 的 Electron 桌面应用源码。上游没有 `SKILL.md`；本入口用于指导安装、使用和修改该应用，不把 GUI 应用伪装成一个可自动调用的 API。

## 适用任务

- 帮用户安装或启动 Open CoDesign。
- 根据产品说明指导其配置 Anthropic/OpenAI/Gemini/OpenRouter/Ollama 等模型来源。
- 修改或排查应用源码、内置模板、导出器、运行时与 UI。
- 查找应用内置设计方法、品牌参考或工作区协议的实现位置。

## 最短使用流程

1. 执行前先阅读项目根目录 `README.md` 的 Quickstart。
2. 优先按用户系统选择安装方式：
   - macOS：`brew install --cask opencoworkai/tap/open-codesign`
   - Windows：`scoop bucket add opencoworkai https://github.com/OpenCoworkAI/scoop-bucket && scoop install opencoworkai/open-codesign`
   - 也可从 GitHub Releases 下载 DMG/EXE/AppImage/DEB/RPM。
3. 首次启动后在 Settings 中配置 ChatGPT 登录、API Key、本地 Ollama 或 OpenAI-compatible 网关。
4. 选择内置示例或输入设计需求，在沙箱预览中迭代，再通过导出菜单保存 HTML/PNG/PPTX/ZIP 等应用支持的格式。

## 从源码运行

使用 Node.js 22 LTS 和上游锁定的 pnpm：

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm --filter @open-codesign/desktop dev
```

不要用 `npm install` 替代 pnpm workspace 安装。`pnpm dev` 会同时启动桌面应用与文档站；仅需桌面应用时使用上面的 filter 命令。

## 源码导航

- `apps/desktop/`：Electron 主进程、preload、渲染端 UI 与打包资源。
- `apps/desktop/resources/templates/skills/`：应用内置设计方法技能模板。
- `apps/desktop/resources/templates/brand-refs/`：内置品牌设计参考。
- `packages/core/`、`packages/runtime/`、`packages/providers/`：生成循环、本地工具、模型提供方等核心逻辑。
- `packages/exporters/`：HTML/PPTX/PNG/PDF/ZIP 等导出实现。
- `packages/templates/`、`packages/i18n/`、`packages/ui/`：模板、国际化和共享 UI。
- `SOURCE_EDITING.md`、`WEB_SEARCH.md`、`docs/VISION.md`：源码编辑、网页研究约束和产品决策说明。
- `CONTRIBUTING.md`：源码运行命令与工程约定。

## 失败处理

1. 安装或启动失败时，先核对操作系统版本、Node/pnpm 版本、锁文件安装命令和上游 Release 说明。
2. 模型连接失败时，让用户在应用 Settings 里查看 provider 诊断与测试连接结果；不要请求或复述完整密钥。
3. 修改源码前先定位相关 package 和测试/类型边界；本集成已剔除上游测试文件，完整回归应对照上游仓库或 GitHub CI。
4. 文档中的安全、许可和发布说明以保留的上游文档为准；不要在未读实现前推断权限边界。

[OpenCoworkAI/open-codesign]: https://github.com/OpenCoworkAI/open-codesign
