---
name: KrillinAI
description: 全链路 AI 视频翻译与配音工具。支持视频下载、ASR 语音识别、LLM 多语种翻译，并提供高保真克隆音色的 TTS 配音及横竖屏自适应剪辑，适用于跨语种视频出海与本地化。Leading Words: AI视频翻译, 视频配音, 语音克隆, KrillinAI
---

# KrillinAI 技能指南

> 本地快照：上游 master@941825ce（2026-09-01，晚于最新 tag v2.1.1）。上游源：https://github.com/krillinai/KrillinAI

## 1. 核心法则 (Golden Rules)
* **强制前置阅读**：执行任何视频翻译与配音任务前，必须先查阅根目录 `README.md`（安装部署与三种运行形态）与 `docs/zh/cli.md`（阶段化 CLI 契约：参数、JSON 输出、退出码、错误分类）。
* **环境检测**：本项目为 Go 应用，执行前确认 Go 工具链与外部依赖（FFmpeg、yt-dlp）可用；Whisper 系列转录依赖为按需延迟安装（defer transcription dependencies），首次调用转录阶段时才拉取，勿在环境检查阶段强制预装。
* **配置先行**：服务/桌面模式需在 `config` 目录下参照 `config-example.toml` 的注释创建并填写 `config.toml`（LLM、ASR、TTS 凭据等）；CLI 模式同样读取该配置。

## 2. 运行形态与入口
| 形态 | 入口 | 适用 |
|---|---|---|
| CLI（Agent 首选） | `go build -o build/krillinai-cli ./cmd/cli` | 脚本编排、CI/CD、AI Agent 分阶段调用 |
| Server（Web UI） | `cmd/server` | 服务器部署，浏览器访问 `http://127.0.0.1:8888` |
| Desktop | `cmd/desktop` | 桌面客户端，图形化配置 |

## 3. 轨迹驱动执行引擎 (Execution Trajectory)
当你接收到自动化视频翻译/配音的任务时，请依循以下状态机推进：

* **[State: 意图定位与资源准备]**
  * 查阅 `README.md` 与 `docs/zh/cli.md`，确认目标命令集（`subtitle` / `tts` / `voices` / `render-horizontal` / `render-vertical` / `pipeline` / `cover` / `status`）。
  * 确认用户提供的目标视频（YouTube/Bilibili 链接或 `local:` 本地路径）、目标语言、TTS provider（`aliyun` / `openai` / `edge-tts`）及是否克隆原声。
  * 复杂任务先用 `--dry-run` 校验参数，不触发任何下载与外部 API 调用。
* **[State: 脚本执行与流式生成]**
  * 引导用户配置 `config.toml` 所需凭据（LLM 翻译、ASR、多 provider TTS）。
  * 以 stdout 的单行 JSON 为唯一可靠输出（勿解析普通日志）；串联阶段依赖工作目录中的 `krillinai_manifest.json` 复用上游产物。
  * 典型链路：`subtitle` → `tts` → `render-horizontal`/`render-vertical`，或一条 `pipeline --outputs "subtitle,tts,horizontal-dubbed,cover"` 完成。
* **[State: 渲染交互与产出交付]**
  * 按 JSON 输出的 `outputs` 字段定位产物（双语字幕、配音音频、横竖屏成品、AI 封面）并回报路径；竖屏模式可带 `--major-title`/`--minor-title`。

## 4. 异常处理模式 (Exception Handling)
* **依赖缺失**（退出码 3 / `error.kind=dependency`）：立即停止，按 `README.md` 与 `faq.md` 输出精确安装指引（FFmpeg、yt-dlp 等），勿盲目重试。
* **网络或配额阻断**（退出码 2 / `error.kind=retryable`）：等待后重试；连续失败时截取最新日志，排查代理网络或 API 配额。
* **用法错误**（退出码 1 / `error.kind=usage`）：对照 `docs/zh/cli.md` 修正参数后重试。
* **扩展排查**：阿里云 OSS/语音配置见 `aliyun.md`；Docker 部署见 `docker.md`；音色代码见 `edge_tts_voice_code.md` 与 `krillinai voices` 命令。
