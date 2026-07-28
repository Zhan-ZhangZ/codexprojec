---
name: xiaohongshu-mcp
description: 小红书平台 MCP Server（Go 实现）。通过 go-rod 浏览器自动化提供 14 项 MCP 工具：扫码登录、图文/视频发布（支持定时）、Feed 推荐流、关键词搜索、笔记详情与评论抓取、评论/回复发送、点赞/收藏、用户主页获取。支持 Docker / 二进制 / 浏览器插件三种部署方式。Leading Words: 小红书MCP服务, 图文视频自动发布, Feed搜索与评论抓取, go-rod浏览器自动化
---

# xiaohongshu-mcp

小红书平台 MCP Server（Go 实现，v2.2.5）。基于 go-rod 浏览器自动化，为 AI 助手提供直接访问小红书数据和操作的能力。

> **使用前必读**：请先 `view_file` 阅读本项目的 [README.md](README.md)，获取完整的部署方式（Docker / 二进制 / 浏览器插件）和配置参数说明。

## 核心法则

1. **先登录再操作** — 除 `check_login_status` / `get_login_qrcode` 外，所有工具均需已登录状态
2. **发布前必须用户确认** — 绝不自动发布内容，必须经用户明确同意
3. **标题 ≤ 20 字，正文 ≤ 1000 字** — 小红书平台硬性限制
4. **图文优先** — 图文流量优于视频和纯文字

## MCP 工具清单（14 项）

| # | 工具名 | 功能 | 类型 |
|---|--------|------|------|
| 1 | `check_login_status` | 检查登录状态 | 只读 |
| 2 | `get_login_qrcode` | 获取登录二维码（Base64） | 只读 |
| 3 | `delete_cookies` | 重置登录状态 | 破坏性 |
| 4 | `publish_content` | 发布图文（标题+内容+图片+标签+定时） | 破坏性 |
| 5 | `list_feeds` | 获取首页推荐 Feed 列表 | 只读 |
| 6 | `search_feeds` | 关键词搜索笔记 | 只读 |
| 7 | `get_feed_detail` | 笔记详情 + 互动数据 + 评论 | 只读 |
| 8 | `user_profile` | 获取指定用户主页与笔记列表 | 只读 |
| 9 | `post_comment_to_feed` | 发表评论 | 破坏性 |
| 10 | `reply_comment_in_feed` | 回复指定评论 | 破坏性 |
| 11 | `publish_with_video` | 发布视频（仅本地文件） | 破坏性 |
| 12 | `like_feed` | 点赞/取消点赞 | 破坏性 |
| 13 | `favorite_feed` | 收藏/取消收藏 | 破坏性 |
| 14 | `get_my_profile` | 获取当前登录用户主页 | 只读 |

## 部署方式

- **方案 A**：Openclaw 深度集成（推荐开发者）
- **方案 B**：x-mcp 浏览器插件版（零配置，推荐非技术用户）
- **方案 C**：Docker 容器（`docker pull xpzouying/xiaohongshu-mcp`）
- **方案 D**：GitHub Releases 下载预编译二进制

## 子技能

- `skills/post-to-xhs/` — 小红书内容发布技能（图文 + 长文模式），支持多账号管理

## 异常处理

- **未登录** → 调用 `get_login_qrcode` 引导用户扫码
- **Cookie 过期** → 调用 `delete_cookies` 重置后重新登录
- **图片链接失效** → 建议用户使用本地图片绝对路径
- **标题/正文超限** → 自动截断并提示用户确认
