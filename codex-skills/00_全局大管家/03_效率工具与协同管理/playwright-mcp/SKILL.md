---
name: playwright-mcp
description: 微软官方 Playwright 浏览器自动化操控引擎 (MCP)。赋予智能体开启无头/有头浏览器、执行页面元素审查、点击输入及端到端 UI 测试的能力。作为物理世界的视觉交互之手。Leading Words: Playwright浏览器自动化操控, 微软官方端到端UI测试, 无头浏览器元素审查交互, MCP代理服务页面点击
version: 0.0.80
---

# playwright-mcp

微软官方 `@playwright/mcp`：把 Playwright 浏览器自动化封装成 MCP 服务器，让 Agent 用结构化工具操控真实浏览器——导航、点击、填表、截图、网络监听、执行 JS。

## 核心特性

- **无障碍树驱动**：基于 Playwright accessibility tree 而非像素输入，快速轻量、确定性工具应用，无需视觉模型
- **状态注入**：`--user-data-dir`（持久用户目录）/ `--storage-state`（cookies+localStorage）/ `--init-page`（页面初始化 TS 脚本）
- **配置文件**：JSON 配置浏览器、上下文与网络（详见 references/README.md「Configuration file」节）

## 安装（用户侧）

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

也支持 VS Code / Cursor / Amp / Gemini CLI 等客户端，安装矩阵见 [references/README.md](references/README.md)。

## 工具速览（30 个）

browser_navigate / browser_click / browser_hover / browser_type / browser_fill_form / browser_select_option / browser_press_key / browser_file_upload / browser_drag / browser_drop / browser_snapshot / browser_take_screenshot / browser_console_messages / browser_network_requests / browser_network_request / browser_evaluate / browser_run_code_unsafe / browser_wait_for / browser_find / browser_handle_dialog / browser_tabs / browser_resize / browser_navigate_back / browser_close / browser_get_config / browser_network_state_set / browser_route / browser_route_list / browser_unroute / browser_cookie_clear

逐工具签名与示例见 [references/README.md](references/README.md) 的 Tools 节。

## 参考文档索引

- [references/README.md](references/README.md) — 上游官方说明（安装矩阵/配置/工具参考）
- [references/server.json](references/server.json) — MCP 服务器元数据清单（v0.0.80）
- [references/CONTRIBUTING.md](references/CONTRIBUTING.md) — 贡献指南
- [references/SECURITY.md](references/SECURITY.md) — 安全策略
- [references/LICENSE](references/LICENSE) — 许可证

> 用户经 npm 安装运行，本库只携文档层；`src/`、`tests/`、`Dockerfile`、入口 JS 未随库分发，需要时访问 [上游仓库](https://github.com/microsoft/playwright-mcp/tree/4c1fb03)。
