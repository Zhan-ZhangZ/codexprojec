---
name: chatcut-installer
description: "ChatCut AI 视频剪辑插件安装引导（本仓库自研）。当用户想做视频剪辑、剪视频、装 ChatCut，或说「阅读 chatcut.io/chatgpt 帮我安装 ChatCut 插件并创建一个新任务」时使用：引导 Codex Agent 完成 ChatCut 插件的安装、登录授权、验证与首个剪辑任务交接。适合场景：剪辑视频、视频剪辑、剪片子、装剪辑插件、AI 剪辑、字幕转场、MG 动画、配音配乐视频制作。Leading Words: 剪辑, 视频剪辑, 剪视频, ChatCut, chatcut安装, 剪辑插件, AI视频编辑, 字幕转场, MG动画, 创建剪辑任务"
metadata:
  origin: 本仓库自研
  official_source: "https://chatcut.io/chatgpt"
  marketplace: "https://github.com/ChatCut-Inc/agent-plugin.git"
---

# ChatCut 安装引导（chatcut-installer）

**官方教程**：<https://chatcut.io/chatgpt>（本技能为其完整 Agent 执行契约的本地化蒸馏，装完后可回读官方页校准）

ChatCut 是对话式 AI 视频编辑器（剪辑/字幕/转场/MG 动画/配音配乐/素材生成），通过 Codex 插件 + MCP 接入。用户一句「帮我安装 ChatCut」背后是六步流程，本技能保证 Agent 不漏步、不瞎猜。

## 何时使用

- 用户提到：**剪辑 / 视频剪辑 / 剪视频 / AI 剪辑 / ChatCut**，且本机尚未安装 ChatCut 插件
- 用户直接说：「阅读 chatcut.io/chatgpt，帮我安装 ChatCut 插件并创建一个新任务」（官方一句话指令）
- 用户想在 ChatGPT/Codex 里直接剪视频、做字幕、加转场、生成 MG 动画

不触发：用户只是讨论剪辑理论、或 ChatCut 已装好（直接进入剪辑工作流，不走本技能）。

## 执行契约（按序执行，禁止跳步）

先通读本文件再动手。**不得**在安装、登录、验证、浏览器检查、故障排除任何一步后提前停止——未打印最终自报告前，安装不算完成。

### 第 0 步：宿主环境门禁（最先判断）

判断当前会话运行在 **ChatGPT/Codex 网页版**还是**桌面端本地应用**：

- **网页版 / 隔离远程工作区** → 立即停止，不要运行任何安装命令（无法修改桌面端本地插件目录）。告诉用户：在目标机器上打开 ChatGPT/Codex **桌面端**，新开会话，粘贴与用户语言匹配的安装指令：
  - 中文：`阅读 chatcut.io/chatgpt ，帮我安装 ChatCut 插件并创建一个新任务。`
  - 英文：`Read chatcut.io/chatgpt to install the ChatCut plugin and set up a new task for me.`
- **桌面端本地** → 继续。不确定时，先问用户当前是网页版还是桌面端。

### 第 1 步：定位桌面端内置 Codex CLI（关键前置）

后续所有命令必须调用**桌面端内置的 Codex CLI**，禁止使用 npm/Homebrew/PATH 里随便找到的独立 `codex`。先定位其完整路径，记为 `"<BUNDLED_CODEX>"`（保留引号，Windows 或含空格路径尤其如此）。

验证可用：

```bash
"<BUNDLED_CODEX>" --version
```

注意：安装插件不要求 Node.js 已在 PATH；但若后续验证时 `node_repl` MCP 不可用，可能是 Node.js 未暴露到 PATH（Codex 通常内置 Node 环境，补 PATH 即可，不必另装）。

### 第 2 步：安装插件

```bash
# 添加 Git marketplace（main 分支）
"<BUNDLED_CODEX>" plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git --ref main

# 列出 marketplace，记下 Codex 分配的名称 <MARKETPLACE>
"<BUNDLED_CODEX>" plugin marketplace list

# 列出该 marketplace 内插件
"<BUNDLED_CODEX>" plugin list --marketplace <MARKETPLACE>

# 安装 ChatCut
"<BUNDLED_CODEX>" plugin add chatcut@<MARKETPLACE>
```

**不要此时开新会话**——先完成登录与验证。

故障处理：
- **Git 报 `program not found`：** 先 `git --version` 确认终端内 Git 可用。Windows 上 Codex 内置 Git 常在 `%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`，存在则把该目录临时加进 PATH 重试；持久修复写入用户 PATH 后**开新终端**重试。除非确认无任何可用 Git，才最后手段安装 Git。
- **网络超时/TLS/DNS/代理错误：** 经用户本地 HTTP 代理重试（常见端口 7890/7897/1080/8080/8888），如 `HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890` 后重跑失败命令；测完不要留下坏代理配置。

### 第 3 步：登录授权

```bash
"<BUNDLED_CODEX>" mcp login chatcut
```

自动打开浏览器 OAuth 页，跟随完成登录。超时/取消/回调失败时：**同一命令重试**（一次只跑一个登录尝试），直到成功、用户叫停、或确认无进展。成功后登录态对后续 Codex 会话持续有效。

### 第 4 步：验证

```bash
"<BUNDLED_CODEX>" plugin list --marketplace <MARKETPLACE> --json   # chatcut 行应为 installed, enabled
"<BUNDLED_CODEX>" plugin marketplace list --json                    # marketplace 可读
"<BUNDLED_CODEX>" mcp get chatcut --json                            # ChatCut MCP 已注册
"<BUNDLED_CODEX>" mcp list --json
"<BUNDLED_CODEX>" mcp get node_repl --json                          # node_repl 应为 enabled
```

- 全部通过且能发现浏览器控制 → 进入第 5 步。
- Windows 上浏览器控制发现失败 → 按 [references/windows-fix.md](references/windows-fix.md) 修复（node_repl.exe 缺 VC 运行时 DLL 的经典问题），修复后**完全退出并重开 Codex、开新线程**再回到第 5 步。

### 第 5 步（必需收尾）：创建首个剪辑会话

**安装会话本身无法调用新装的 MCP 工具——必须新建会话。** 依据验证结果选模式：

- **editing 模式**（插件 installed+mcp login 成功+node_repl enabled+全验证过）：新会话发送中文交接提示词（全文见 [references/handoff-prompts.md](references/handoff-prompts.md)）——让新会话用内置浏览器打开 ChatCut 项目「我的第一个ChatCut视频」，先自述能力（视频剪辑/MG 动画/素材生成三部），再询问用户素材与意图。
- **recovery 模式**（任一步失败或未确认）：新会话发送恢复提示词，注明**具体失败步骤与最有用的错误信息**（不得泛化），让新会话重试安装登录，成功后再另开剪辑会话。

在 Codex 宿主上的创建顺序（禁止跳到兜底）：
1. **DISCOVER（必做）**：`tool_search` 搜索 `create_thread`、`send_message_to_thread`、`navigate_to_codex_page`、`set_thread_title`、`list_projects`（动态工具，搜了才可调用）；仅当 tool_search 不存在才扫可见工具。
2. **保持项目上下文**：本安装会话属于某 project/workspace 时，新会话建在同一 target（用 `list_projects` 解析 projectId）；无项目则建无项目会话。
3. **CREATE**：`create_thread` 直接带交接提示词为初始消息；不支持则先建线程再立即 `send_message_to_thread`。**新线程必须包含交接提示词，空线程=失败。**
4. **SWITCH**：调 `navigate_to_codex_page` 把用户切进新线程。
5. **TITLE（可选）**：`set_thread_title`（editing 用项目名；recovery 用「完成 ChatCut 安装」）。
6. **兜底（最后手段）**：仅当 tool_search 不可用且无等价工具、搜索无结果、无法保持项目上下文、或调用实际报错时，才把交接提示词交给用户自行粘贴，并说明具体缺失项。

### 第 6 步：必需自报告（结束前打印恰好一条）

- **(A)** editing 模式：「已创建新的剪辑会话并发送首条提示」+ 新线程标题/ID + 说明本会话仅是安装会话，请到新会话继续剪辑。
- **(R)** recovery 模式：「安装未完成，已创建恢复会话」+ 新线程标题/ID + 具体失败步骤 + 明确告知 ChatCut 尚未就绪。
- **(B)** 无法自动创建：说明安装是否完成，给出应粘贴的交接提示词，指出第 1/2/3/4 步哪步不可用或失败。

**完成门**：`handoffMode` 不是 editing 就不得宣称安装成功；创建恢复会话≠安装成功；只有交接提示词已进入新会话（报告 A/R）或带具体缺失说明交给用户（报告 B）才算交接完成。

## 更新

```bash
"<BUNDLED_CODEX>" plugin marketplace upgrade            # 全部 marketplace
"<BUNDLED_CODEX>" plugin marketplace upgrade <MARKETPLACE>
```

升级后重跑第 4 步验证命令。

## 维护说明（本库）

- 本技能为**本仓库自研**引导层：蒸馏自官方安装页（2026-10-16 抓取），官方流程变更时以 <https://chatcut.io/chatgpt> 为准并同步更新本文件。
- 用户带个性化参数的链接（如 `chatcut.io/chatgpt?c=...`）与规范页 `chatcut.io/chatgpt` 流程一致，无需区分。
