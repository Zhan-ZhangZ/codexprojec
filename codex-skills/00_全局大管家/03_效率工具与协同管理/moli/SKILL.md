---
name: moli
description: "墨鲤网页生成引擎。浏览器渲染驱动的网页生成/截图：渲染内核+协议层+兼容层。Leading Words: 墨鲤, 网页渲染,
  浏览器截图, 网页生成, moli"
metadata:
  upstream: github.com/lexmount/moli
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# moli

墨鲤网页生成引擎。浏览器渲染驱动的网页生成/截图：渲染内核+协议层+兼容层。

## 何时使用

适用任务：墨鲤网页生成引擎。浏览器渲染驱动的网页生成/截图：渲染内核+协议层+兼容层。
相关检索词：墨鲤、Moli。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/moli-cdp-server/SKILL.md` — **moli-cdp-server**：Start Moli's CDP server and connect Playwright, Puppeteer, or raw CDP clients. Use to run a headless-browser CDP endpoint, replace a Chromium process, attach over CDP, enable real layout and screenshot surfaces, or diag…
- `skills/moli-webfetch/SKILL.md` — **moli-webfetch**：Fetch, inspect, crawl, and capture live, JavaScript-rendered websites with Moli. Use when Codex needs current web content, web research, fact lookup, link following, a bounded crawl, client-rendered or response-gated co…
- `skills/moli-websearch/SKILL.md` — **moli-websearch**：Search the web by keyword or reverse-search images with Moli to find subjects, sources, exact matches, or similar images—even when Moli is not named. For fetching a known URL, use moli-webfetch.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `Cargo.toml`
- `docs/`

## 上游

- https://github.com/lexmount/moli
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
