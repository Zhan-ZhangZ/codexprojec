---
name: openmaic
description: "多智能体交互式数字课堂与课件全自动生成套件。支持输入任意主题或上传本地文档、PDF、音视频，一键全自动生成包含 AI 教师口播授课、AI 同学讨论反思、白板演算推导、课堂测验 Quiz、交互式实验仿真与 PBL 项目制学习的沉浸式虚拟课堂。支持导出为可编辑 PPTX 幻灯片与离线交互式 HTML 课件，提供 Pro 课件编辑器进行拖拽与 AI 局部修剪，并内置 23 种教学设计与工作台技能。Leading Words: 课件全自动生成, PPT课件制作, AI做课件, 虚拟课堂生成, AI教师授课口播, 白板演算推导, 课堂测验Quiz生成, PBL项目制教学设计, 互动课件导出PPTX"
---

# OpenMAIC 多智能体交互式数字课堂全栈套件

OpenMAIC（Open Multi-Agent Interactive Classroom）是由清华大学多智能体交互与协作课题组（THU-MAIC）开源的互动教学与课件生成系统。能够将任何主题、文档或音视频瞬间转化为包含 AI 教师授课、AI 同学讨论互动、白板推演、测验 Quiz、交互式仿真及 PBL（项目制学习）的沉浸式虚拟课堂。

> ⚠️ **前置必读**：在执行任何具体操作或构建课堂前，请先使用 `view_file` 阅读本地说明文档：
> - 中文主文档：[README-zh.md](README-zh.md)
> - 英文主文档：[README.md](README.md)
> - 专项参考指南：详见 `references/` 目录中的 [live-demo.md](references/live-demo.md), [startup-modes.md](references/startup-modes.md), [provider-keys.md](references/provider-keys.md), [generate-flow.md](references/generate-flow.md), [extend.md](references/extend.md)。

---

## ⚠️ 核心法则 (The Golden Rules)

1. **状态安全与确认前置**：严禁在未获用户确认的情况下直接篡改生产配置或执行不可逆破坏性操作。涉及修改本地 `.env.local` 密钥配置时，指导用户自行填写或确认模板，避免敏感密钥泄露。
2. **模式严格分流**：
   - 快速体验优先推荐 **Live Demo 模式**（官方托管于 open.maic.chat，只需 Access Code 访问码即可直接生成课堂）。
   - 本地私有化推荐 **本地开发模式** (`pnpm dev`) 或 **Docker 容器化模式** (`docker compose up`)。
   - 深度定制直接进入 **二次开发分支**，使用 `@openmaic/*` SDK 模块定制 DSL、渲染器或编辑器。
3. **环境硬性校验**：本地运行要求 Node.js >= 20、pnpm >= 10。如果本地未安装对应环境，优先提示用户启动 Docker 容器或切换为 Live Demo 模式。
4. **长任务容错与状态追踪**：生成完整课堂为重型多 Agent 协同流程（包含课纲生成、脚本编写、PPT生成、白板动画、TTS合成等），必须通过任务 ID 执行稀疏轮询，并友好告知当前进度与阶段。

---

## ⚙️ 轨迹驱动执行引擎 (Execution Trajectory)

请严格按以下状态机阶段推进任务，严禁跳步：

### Gate 0: 意图识别与模式选择 (Mode Selection)

首先识别用户诉求与当前环境状态：
1. **云端托管模式 (Live Demo)**：
   - 适用：用户想要快速体验、免部署一键生成课堂。
   - 入口：官方托管服务 `https://open.maic.chat`。
   - 凭证：引导用户登录后在「访问码设置」获取以 `sk-` 开头的 Access Code。
2. **本地全栈模式 (Self-Hosted / Local)**：
   - 适用：用户需要本地私密运行、使用自有私有模型或离线运行。
   - 进入 **Gate 1** 执行环境与配置探测。
3. **二次开发与扩展模式 (Secondary Development / SDK)**：
   - 适用：修改课堂组件、接入专属模型供应商、定制课件 DSL 或嵌入三方系统。
   - 查阅 `references/extend.md` 与 `packages/@openmaic/*` 源码。

---

### Gate 1: 依赖探测与密钥配置 (Environment & Config)

当执行本地或 Docker 部署时：
1. **依赖环境检查**：
   - Node.js >= 20 (`node -v`)
   - pnpm >= 10 (`pnpm -v`)
   - （可选音视频提取）ffmpeg / ffprobe
2. **模型供应商配置**：
   - 配置文件：`.env.local`（基于 `.env.example` 复制）或 `server-providers.yml`。
   - 支持供应商：OpenAI, Azure OpenAI, Anthropic, Google Gemini (推荐 Gemini 3 Flash), DeepSeek, Qwen, Kimi, MiniMax, GLM, Ollama, Lemonade, FunASR 等。
   - 建议模型：`DEFAULT_MODEL=google:gemini-3-flash-preview` 或 `openai:gpt-5.5` / `minimax:MiniMax-M2.7-highspeed`。

---

### Gate 2: 服务启动与健康探针 (Startup & Health Probe)

1. **开发模式**：
   ```bash
   pnpm install
   pnpm dev
   ```
   默认启动于 `http://localhost:3000`。
2. **生产构建 / Docker 启动**：
   ```bash
   docker compose up --build
   ```
3. **健康检查验证**：
   - 发起请求：`GET http://localhost:3000/api/health`
   - 确保返回状态码 `200` 且各核心模块（LLM、Renderer）健康。

---

### Gate 3: 课堂课件生成工作流 (Classroom Generation Workflow)

进入生成流程（详见 `references/generate-flow.md`）：
1. **输入解析**：
   - 主题提示词（Topic Prompt）
   - 或本地文档/音视频资料（PDF, PPTX, MP4, MP3 等，需征得用户确认后读取）
2. **多智能体协同流水线**：
   - **Curriculum Planner**：规划教学大纲、课时重点与认知阶梯。
   - **Teacher & Student Agents**：编排主讲教师台词、互动提问与学生质疑反思。
   - **Slide & Whiteboard Engine**：生成视觉幻灯片、绘制公式推导与图表架构。
   - **Interactive / PBL Engine**：生成测验选择题、3D/代码交互式模拟或项目制探究课题。
3. **交付与导出**：
   - 在线课堂交互式体验 URL。
   - 导出为可编辑的 PowerPoint 演示文稿（`.pptx`）。
   - 导出为离线单文件交互式网页（`.html`）。

---

### Gate 4: 二次开发与生态扩展 (@openmaic/* SDK)

若进行二开定制，引导调用相应源码包：
- `@openmaic/dsl`：课件与舞台描述语言规范定义与验证。
- `@openmaic/renderer`：React 19 驱动的课堂多角色渲染画布与白板引擎。
- `@openmaic/editor`：Pro Mode 课件编辑器（支持拖拽、旋转、AI Patch局部微调）。
- `@openmaic/importer`：支持 `.pptx`、PDF 及富文本课件逆向导入转换为 DSL。
- `@openmaic/storage`：基于 Postgres 的课堂状态持久化与多轮会话存储。

---

## 📝 异常处理与排错指南 (Troubleshooting)

1. **模型调用报错 (401 / 429 / Provider Error)**：
   - 检查 `.env.local` 中的 API Key 及 Base URL 是否匹配。
   - 检查目标模型名称是否正确（如 `DEFAULT_MODEL=openai:gpt-5.5`）。
2. **音视频提取失败或超时**：
   - 检查系统是否安装了 `ffmpeg` 与 `ffprobe` 并在系统 `PATH` 中可执行。
   - 云端提取模式可配置阿里文档智能（AliDocMind）作为 fallback 备选。
3. **端口被占用 (Port 3000 EADDRINUSE)**：
   - 提示使用 `PORT=3001 pnpm dev` 或清理占用进程。
4. **生成任务中断或卡住**：
   - 检查 Postgres 数据库连接或 session 状态，利用 durable session 机制恢复断点继续执行。
