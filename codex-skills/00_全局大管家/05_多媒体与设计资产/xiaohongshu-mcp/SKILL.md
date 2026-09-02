---
name: xiaohongshu-mcp
description: 小红书平台 MCP Server（Go 实现）。通过 go-rod 浏览器自动化提供 18 项 MCP 工具：扫码登录、图文/视频发布（定时/原创声明/可见范围/带货商品）、Feed 推荐流、关键词搜索（排序/类型/时间筛选）、笔记详情与评论抓取、评论/回复发送、点赞/收藏、用户主页获取、通知中心（未读数/列表/回复/点赞）。支持 Docker / 二进制 / 浏览器插件三种部署方式，v2.5.0 起支持 AUTH_TOKEN 访问鉴权。Leading Words: 小红书MCP服务, 图文视频自动发布, Feed搜索与评论抓取, go-rod浏览器自动化
version: 2.5.0
metadata:
    upstream: github.com/xpzouying/xiaohongshu-mcp
---

# xiaohongshu-mcp

小红书平台 MCP Server（Go 实现，上游 v2.5.0）。基于 go-rod 浏览器自动化，为 AI 助手提供直接访问小红书数据和操作的能力。本技能为**文档层**：工具本体通过 Docker 镜像或 GitHub Releases 预编译二进制分发，本地只保留使用文档与部署配置，不含上游 Go 源码。

> **使用前必读**：请先 `view_file` 阅读本项目的 [README.md](README.md)，获取完整的部署方式（Docker / 二进制 / 浏览器插件）和各客户端配置说明。

## 核心法则

1. **先登录再操作** — 除 `check_login_status` / `get_login_qrcode` 外，所有工具均需已登录状态
2. **发布前必须用户确认** — 绝不自动发布内容，必须经用户明确同意
3. **标题 ≤ 20 字，正文 ≤ 1000 字** — 小红书平台硬性限制
4. **图文优先** — 图文流量优于视频和纯文字
5. **生产环境开鉴权** — 公网/多人环境用 `AUTH_TOKEN` 环境变量启用 Bearer Token 鉴权，客户端配置 `Authorization` 请求头

## MCP 工具清单（18 项，按上游 v2.5.0 源码注册顺序）

> 上游 README 的工具列表（13 项）滞后于代码，以源码 `mcp_server.go` 实际注册为准。

### 登录会话

| # | 工具名 | 功能 | 类型 |
|---|--------|------|------|
| 1 | `check_login_status` | 检查登录状态 | 只读 |
| 2 | `get_login_qrcode` | 获取登录二维码（Base64） | 只读 |
| 3 | `delete_cookies` | 删除 cookies 文件，重置登录状态 | 破坏性 |

### 内容发布

| # | 工具名 | 功能 | 类型 |
|---|--------|------|------|
| 4 | `publish_content` | 发布图文（必需 title/content/images；可选 tags、`schedule_at` 定时（1小时~14天，ISO8601）、`is_original` 原创声明、`visibility` 可见范围（公开/仅自己/互关好友）、`products` 带货商品关键词） | 破坏性 |
| 5 | `publish_with_video` | 发布视频（video 仅本地绝对路径，其余参数同上） | 破坏性 |

### 浏览与获取

| # | 工具名 | 功能 | 类型 |
|---|--------|------|------|
| 6 | `list_feeds` | 获取首页推荐 Feed 列表 | 只读 |
| 7 | `search_feeds` | 关键词搜索（可选 filters：排序/笔记类型/发布时间/搜索范围/位置距离） | 只读 |
| 8 | `get_feed_detail` | 笔记详情 + 互动数据 + 评论（可选加载全部评论、展开二级回复；必需 feed_id + xsec_token） | 只读 |
| 9 | `user_profile` | 获取指定用户主页与笔记列表（必需 user_id + xsec_token） | 只读 |
| 10 | `get_my_profile` | 当前登录用户主页（关注/粉丝/获赞，tab 可选笔记/收藏/点赞） | 只读 |

### 互动

| # | 工具名 | 功能 | 类型 |
|---|--------|------|------|
| 11 | `post_comment_to_feed` | 发表评论 | 破坏性 |
| 12 | `reply_comment_in_feed` | 回复指定评论（comment_id 或 user_id 至少一个） | 破坏性 |
| 13 | `like_feed` | 点赞/取消点赞 | 破坏性 |
| 14 | `favorite_feed` | 收藏/取消收藏 | 破坏性 |

### 通知中心（v2.5.0 新增）

| # | 工具名 | 功能 | 类型 |
|---|--------|------|------|
| 15 | `get_unread_count` | 通知未读数（评论和@ / 赞和收藏 / 新增关注三分区，不清除未读标记） | 只读 |
| 16 | `list_notifications` | 通知列表（返回评论内容与 feed_id/xsec_token；会清除未读标记） | 只读 |
| 17 | `reply_notification` | 回复「评论和@」中的评论（无需先定位笔记） | 破坏性 |
| 18 | `like_notification` | 给「评论和@」中的评论点赞/取消点赞 | 破坏性 |

## 部署方式

- **方案 A**：Openclaw 深度集成（推荐开发者，配合 MCPorter）
- **方案 B**：x-mcp 浏览器插件版（零配置，推荐非技术用户）
- **方案 C**：Docker 容器 — `docker pull xpzouying/xiaohongshu-mcp`（国内可用阿里云镜像源），compose 配置见 [docker/docker-compose.yml](docker/docker-compose.yml)，说明见 [docker/README.md](docker/README.md)
- **方案 D**：GitHub Releases 下载预编译二进制（macOS arm64 / Windows x64 / Linux x64，另配独立登录工具 `xiaohongshu-login-*`）；macOS 后台常驻见 [deploy/macos/readme.md](deploy/macos/readme.md)

部署完成后的登录流程：调用 `get_login_qrcode` 获取二维码 → 用户用小红书 App 扫码 → `check_login_status` 确认。Cookie 持久化在 `~/.xiaohongshu/cookies.json`（Docker 挂载 `./data:/app/data`）。

## 发布流程要点

1. 图文：图片用**本地绝对路径**（Docker 部署需先拷入 `images/` 挂载目录并指定 `/app/images`），或 HTTP 链接
2. 视频：仅支持本地视频文件绝对路径
3. 定时发布：`schedule_at` 传 ISO8601 时间，限定 1 小时至 14 天内
4. 发布前向用户展示标题、正文、图片并获得明确确认

## 子技能

- `skills/post-to-xhs/` — 小红书内容发布技能（图文 + 长文模式），基于 Chrome CDP 的本地发布管线，支持多账号管理，入口见 [skills/post-to-xhs/SKILL.md](skills/post-to-xhs/SKILL.md)

## 引用索引

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 主文档：部署、各客户端（Claude Code/Cursor/Cline/VSCode/Gemini CLI）配置、FAQ |
| [README_EN.md](README_EN.md) | 英文版主文档 |
| [docs/API.md](docs/API.md) | HTTP REST API 与鉴权说明（Base URL `http://localhost:18060`） |
| [docs/windows_guide.md](docs/windows_guide.md) | Windows 部署排障指南（环境变量/Winget 安装） |
| [docker/README.md](docker/README.md) | Docker 部署详解（镜像源/代理 `XHS_PROXY`/鉴权/扫码登录） |
| [deploy/macos/readme.md](deploy/macos/readme.md) | macOS launchd 后台常驻配置 |
| [skills/post-to-xhs/SKILL.md](skills/post-to-xhs/SKILL.md) | 子技能：本地 CDP 发布管线 |

> 上游演示视频/第三方平台集成教程（n8n、CherryStudio、AnythingLLM 等）未随包分发，需要时到 GitHub 仓库查看（README 内已给出定 tag 链接）。

## 异常处理

- **未登录** → 调用 `get_login_qrcode` 引导用户扫码（二维码易过期，先打开 App 再扫码）
- **Cookie 过期** → 调用 `delete_cookies` 重置后重新登录
- **图片链接失效** → 建议用户使用本地图片绝对路径
- **标题/正文超限** → 自动截断并提示用户确认
- **401 Unauthorized** → 服务端启用了 AUTH_TOKEN 鉴权，客户端需补 `Authorization: Bearer <token>` 请求头
- **工具数对不上（如只看到 13 个）** → 上游 README 列表滞后，实际以 18 项为准；用 MCP Inspector 的 List Tools 验证
