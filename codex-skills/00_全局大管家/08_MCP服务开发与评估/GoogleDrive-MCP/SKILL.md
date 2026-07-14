---
name: google-drive-mcp
description: 官方 Google Drive MCP 接入技能。允许智能体通过 OAuth 授权，在本地直接读取、搜索、管理您的谷歌云端硬盘文件，并将 Google Docs/Sheets 自动转换为可供分析的文本格式。Leading Words: 谷歌云盘接入, OAuth授权读取, GoogleDocs转换, 云端硬盘文件管理
---

# ☁️ 谷歌云端硬盘助手 (Google Drive MCP)

## 📌 技能概述
这是一个基于官方 `@modelcontextprotocol/server-gdrive` 的底层能力扩展技能。唤醒该技能后，Agent 将获得读写您 Google Drive 文件的能力。

## ⚠️ 核心法则 (Golden Rules)
1. **凭证前置**：云端硬盘属于强隐私区域。若当前环境中未检测到 Google OAuth 环境变量，**必须优先**引导用户配置凭证，禁止盲目报错。
2. **写操作安全锁 (Safety Gate)**：读取和搜索云端文件是安全的，但涉及任何**修改、移动、删除、或对外分享**的操作时，**绝对禁止自动执行**。Agent 必须使用 `ask_question` 工具将操作目标和后果清晰展示给用户，获得显式 `Submit` 确认后才能下发命令。

## ⚙️ 环境依赖与配置向导
该服务通过 npx 免安装调用，但依赖于您的 Google Cloud 项目授权。

**启动方式**:
```bash
npx -y @modelcontextprotocol/server-gdrive
```

**必须的环境变量**:
- `GOOGLE_DRIVE_CLIENT_ID`: 您的 Google Cloud 项目 OAuth 客户端 ID (Desktop App 类型)。
- `GOOGLE_DRIVE_CLIENT_SECRET`: 对应的客户端密钥。

*(当首次调用遇到 Auth 错误时，Agent 应指导用户访问 https://console.cloud.google.com/ 开启 Google Drive API 并生成凭证。)*

## 🔄 轨迹驱动执行引擎 (Execution Trajectory)

### [State: INIT] -> 状态诊断
- **动作**: 检查是否已配置云端硬盘凭证。
- **分支**:
  - `已配置`: 进入 `[State: PLAN_ACTION]`。
  - `未配置`: 中断流程，向用户输出完整的 Google Cloud Console 获取 Client ID / Secret 的分步教程。

### [State: PLAN_ACTION] -> 意图解析与查询
- **动作**: 根据用户的指令调用 MCP 查询 Drive 目录树或搜索特定文件（如：`Search for "2024 Q3 Report"`）。
- **如果是读取类操作**: 直接执行获取内容，并将提取的 Markdown/CSV 数据返回给用户。
- **如果是写入/删除类操作**: 立即进入 `[State: PENDING_CONFIRMATION]`。

### [State: PENDING_CONFIRMATION] -> 安全阻断
- **动作**: 发现用户意图为修改或删除云盘文件。
- **阻断**: 调用 `ask_question` 弹出模态框：“您正在请求修改/删除云端文件 [文件名]。此操作不可逆，是否继续？”。
- **分支**:
  - `用户批准`: 进入 `[State: EXECUTE_WRITE]`。
  - `用户拒绝/跳过`: 取消该操作，向用户确认安全中止。

### [State: EXECUTE_WRITE] -> 最终执行
- **动作**: 调用 MCP 接口完成云端硬盘的文件写入或删除操作。

## 🛠️ 异常处理模式
- **401/403 报错**: 如果 MCP 返回 Token 错误或权限不足，必须提醒用户可能是 OAuth 授权过期或未给予云端硬盘范围的读写权限。
- **文件找不到 (404)**: 必须先通过搜索 API (`Search`) 帮用户找寻可能的名字变体，而不是直接告诉用户文件不存在。
