---
name: browser-use
description: 基于 Browser-Use 的本地浏览器接管工具。为大语言模型提供通用浏览器控制能力，自动执行网页导航、表单填写和信息抓取等繁琐任务。Leading Words: 浏览器自动化接管, 网页导航控制, 表单自动填写, 通用Web操作
metadata:
  upstream: "github.com/browser-use/browser-use"
  version: "0.13.8"
---

# browser-use

能够让 AI 拟人化且基于语义认知网页结构的自动化智能导航操控库。

> 分发形态：PyPI 库（`pip install browser-use`，CLI 入口 `uvx browser-use`）。本技能目录只保留文档层；源码、测试与构建基建不随包分发，需要时查上游 GitHub 定 tag 链接 https://github.com/browser-use/browser-use/tree/v0.13.8

## 执行前必读

1. 先读 `README.md`：安装（pip / uvx）、CLI 3.0 与 Python 库两条使用路径、Connect/CDP 用法、支持的模型列表与配置项。
2. 按任务类型读上游官方子技能文档（`skills/` 目录）：
   - `skills/browser-use/SKILL.md` —— CDP 直连浏览器控制主入口：本地 Chrome 接管、远程云浏览器、页面操作工作流、录制与 Gotchas
   - `skills/open-source/references/` —— 开源库各 API 面：agent / browser / tools / models / integrations / monitoring / quickstart
   - `skills/cloud/` —— Browser Use Cloud API 参考（v2 / v3 / browser-api、sessions、patterns）
   - `skills/qa/`、`skills/remote-browser/`、`skills/x402/` —— 专项场景
3. 动手写代码前扫一眼 `examples/` 对应主题的最小可运行示例：getting_started、use-cases、models、integrations、custom-functions、features、browser、cloud、file_system、sandbox、ui、observability。

## 云端托管（可选）

需要托管浏览器、并行子代理或隔离环境时读 `CLOUD.md`（面向 AI Agent 的 Browser Use Cloud 使用说明：Session / Browser / Agent / Profile 概念与 REST API 调用序列）。

## 配置

环境变量样例见 `.env.example`（API keys、浏览器可执行路径、headless、代理等）；各示例目录另有局部 env 样例，如 `examples/cloud/env.example`。

## 异常处理

- 版本差异：本技能固定上游 `0.13.8`。CLI 行为以 `browser-use --help` 实测输出为准，文档与实测不一致时以实测为准。
- 本地无源码：涉及内部实现细节（如 `browser_use` 各模块）时，查阅上游源码对应文件 https://github.com/browser-use/browser-use/blob/v0.13.8/browser_use/ ，不要假设本地存在源码文件，也不要尝试 import 本目录内的模块。
- 示例运行报缺依赖时，确认用户环境已 `pip install browser-use` 并配置好 LLM API key，而不是在本目录内找依赖。
