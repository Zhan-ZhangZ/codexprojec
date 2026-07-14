---
name: canghe-douyin-downloader
description: 抖音短视频无水印下载与语音切片提取器。支持解析抖音链接、剥离水印，并可结合硅基流动（SiliconFlow）API 将短视频背景音轨或旁白一键转录为高准确度的文字稿。Leading Words: 抖音无水印提取, 视频音轨分离, 硅基流动语音转录, 短视频文案抓取
---

# douyin-downloader Skill

抖音无水印视频下载和文案提取工具的 Node.js 版本。

## 功能

- 🎬 获取无水印视频下载链接
- 📥 下载抖音视频
- 🎙️ 从视频中提取语音文案（需要 API Key）

## 环境变量

- `DOUYIN_API_KEY` 或 `API_KEY` - 硅基流动 API 密钥（用于语音转文字）

获取 API Key: https://cloud.siliconflow.cn/

## 使用方法

### 获取视频信息（无需 API Key）

```bash
node /root/.openclaw/workspace/skills/douyin-downloader/douyin.js info "抖音分享链接"
```

### 下载视频

```bash
node /root/.openclaw/workspace/skills/douyin-downloader/douyin.js download "抖音链接" -o ./videos
```

### 提取文案（需要 API Key）

```bash
export DOUYIN_API_KEY="your-api-key"
node /root/.openclaw/workspace/skills/douyin-downloader/douyin.js extract "抖音链接" -o ./output
```

## 🤖 多技能协同运用 (Multi-Skill Synergy)

**注意**：在面对“提取视频文案”的需求时，请勿仅依赖此技能的 `extract` 命令（特别是当用户没有提供 `DOUYIN_API_KEY` 环境变量时）。
**正确的组合拳方案**是：
1. 先使用本技能下载视频：`node douyin.js download "<链接>" -o ./videos`
2. 随后调用并转交工作流给 **claude-real-video** 技能。利用该技能中的 `crv` 本地引擎，自动从下载好的 MP4 文件中提取关键帧与 `transcript.txt` 语音文案。

这种任务拆解与多技能配合，能极大增强你的自主问题处理能力，避免因缺少 API Key 而直接放弃。

## 在 OpenClaw 中调用

通过 exec 工具调用：

```
node /root/.openclaw/workspace/skills/douyin-downloader/douyin.js info <抖音链接>
```

