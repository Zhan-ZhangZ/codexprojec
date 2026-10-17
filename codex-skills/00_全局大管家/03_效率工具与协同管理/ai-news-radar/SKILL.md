---
name: ai-news-radar
description: "AI 前沿资讯雷达。自动抓取并总结最新的 AI 行业新闻、模型发布动态及前沿研究论文，提供一手的科技情报摘要。Leading
  Words: AI资讯抓取, 前沿技术雷达, 科技新闻摘要, 模型动态跟踪"
metadata:
  upstream: github.com/LearnPrompt/ai-news-radar
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# ai-news-radar

AI 前沿资讯雷达。自动抓取并总结最新的 AI 行业新闻、模型发布动态及前沿研究论文，提供一手的科技情报摘要。

## 何时使用

适用任务：AI 前沿资讯雷达。自动抓取并总结最新的 AI 行业新闻、模型发布动态及前沿研究论文，提供一手的科技情报摘要。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的作者技能：

- `skills/radar/SKILL.md` — **ai-radar**：查询过去 24 小时的 AI 新闻、模型发布、产品更新和研究动态。普通资讯查询默认读这个入口。
- `skills/ai-news-radar/SKILL.md` — **ai-news-radar**：维护 AI News Radar 项目，包括新增信源、调整抓取、检查信源健康度和部署 Pages。只有用户明确要维护该项目时使用。

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.en.md`
- `requirements.txt`
- `docs/`

## 上游

- https://github.com/LearnPrompt/ai-news-radar

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
