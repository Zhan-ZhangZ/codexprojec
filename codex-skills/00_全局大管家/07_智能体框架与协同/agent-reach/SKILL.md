---
name: agent-reach
description: 免 API 密钥的 16+ 平台数据抓取与 Exa 搜索工具。支持获取推特、小红书、微博、YouTube等媒体的内容与字幕。Leading Words: 免API密钥数据抓取, Exa平台内容获取, 推特小红书搜索, YouTube字幕提取
---

# Agent-Reach 🌐

Give AI agents direct, unified access to real-time internet data and 16+ major social/video/forum platforms without requiring official API tokens.

- **Project Homepage**: https://github.com/Panniantong/Agent-Reach

## Installation

```bash
# Clone the repository
git clone https://github.com/Panniantong/Agent-Reach.git

# Install dependencies
npm install -g agent-reach
```

## Features & Supported Platforms

- **免 API 费用 (No API Fees)**: Bypasses expensive API limits using lightweight scraping and session cookies.
- **多平台支持 (16+ Platforms)**:
  - **社交/社区**: Twitter/X, Reddit, 小红书 (XiaoHongShu), 微博 (Weibo), V2EX.
  - **多媒体/视频**: YouTube (subtitles & transcripts), Bilibili (B站), 抖音 (Douyin), 小宇宙 (Xiaoyuzhou podcasts).
  - **开发与资讯**: GitHub (Issues/Repos), RSS Feeds, general web search via Exa.
- **故障自愈 (Auto-Fallback)**: Automatically routes requests to backup proxies/crawlers if a target platform blocks the primary access chain.
- **环境检查 (Doctor Utility)**: Includes `agent-reach doctor` to test and resolve local connectivity and configuration issues.

## Usage Guide

### 1. General Search & Exa Integration
```bash
agent-reach search "ai coding agents text-to-cad"
```

### 2. Social Media Scraper
```bash
# Crawl posts and replies from Twitter/X
agent-reach twitter post "https://x.com/username/status/12345"

# Extract Xiaohongshu (小红书) post detail
agent-reach xhs post "https://www.xiaohongshu.com/explore/xxxx"
```

### 3. Media Transcripts
```bash
# Retrieve subtitles/transcripts from a YouTube video
agent-reach youtube transcript "https://www.youtube.com/watch?v=xxxx"

# Fetch Bilibili (B站) video description and AI subtitles
agent-reach bilibili video "https://www.bilibili.com/video/BVxxxx"
```

### 4. Configuration
If authentication is required for private platforms, place the required credentials/cookies locally. Credentials stay encrypted locally in `~/.agent-reach/config.json`.
