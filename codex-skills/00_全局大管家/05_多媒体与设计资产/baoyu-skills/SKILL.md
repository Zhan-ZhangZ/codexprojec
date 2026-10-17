---
name: baoyu-skills
description: "宝玉 Agent Skills 合集。按任务提供文章配图、知识漫画、信息图、封面、长图卡片、演示文稿、PDF/DOCX/XLSX、Markdown 转换与社媒发布等 20 个工作流。"
metadata:
  upstream: github.com/JimLiu/baoyu-skills
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# baoyu-skills

这个合集把文章分析、视觉资产生成、文档处理和社媒发布拆成可单独加载的作者技能。先选与产物最接近的一项，不要一次加载整个合集。

## 何时使用

适用任务：文章配图、封面、信息图、小红书图卡、漫画、幻灯片、Markdown 转换、文档处理和公众号/微博/X 发布。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/baoyu-article-illustrator/SKILL.md` — **baoyu-article-illustrator**：Analyzes article structure, identifies positions requiring visual aids, generates illustrations with Type × Style × Palette three-dimension approach. Use when user asks to "illustrate article", "add images", "generate…
- `skills/baoyu-comic/SKILL.md` — **baoyu-comic**：Knowledge comic creator supporting multiple art styles and tones. Creates original educational comics with detailed panel layouts and batch-capable image generation. Use when user asks to create "知识漫画", "教育…
- `skills/baoyu-compress-image/SKILL.md` — **baoyu-compress-image**：Compresses images to WebP (default) or PNG with automatic tool selection. Use when user asks to "compress image", "optimize image", "convert to webp", or reduce image file size.
- `skills/baoyu-cover-image/SKILL.md` — **baoyu-cover-image**：Generates article cover images with 5 dimensions (type, palette, rendering, text, mood) combining 11 color palettes and 7 rendering styles. Supports cinematic (2.35:1), widescreen (16:9), and square (1:1) aspects. Use w…
- `skills/baoyu-danger-gemini-web/SKILL.md` — **baoyu-danger-gemini-web**：Generates images and text via reverse-engineered Gemini Web API. Supports text generation, image generation from prompts, reference images for vision input, and multi-turn conversations. Use when other skills need image…
- `skills/baoyu-danger-x-to-markdown/SKILL.md` — **baoyu-danger-x-to-markdown**：Converts X (Twitter) tweets and articles to markdown with YAML front matter. Uses reverse-engineered API requiring user consent. Use when user mentions "X to markdown", "tweet to markdown", "save tweet", or provides x.c…
- `skills/baoyu-diagram/SKILL.md` — **baoyu-diagram**：Create professional, dark-themed SVG diagrams of any type — architecture diagrams, flowcharts, sequence diagrams, structural diagrams, mind maps, timelines, illustrative/conceptual diagrams, and more. Use this skill w…
- `skills/baoyu-electron-extract/SKILL.md` — **baoyu-electron-extract**：Extracts resources and JavaScript from any installed Electron app (`.asar` bundle), restoring original sources from `.js.map` files when available or formatting minified code with Prettier otherwise. Use when user wants…
- `skills/baoyu-format-markdown/SKILL.md` — **baoyu-format-markdown**：Formats plain text or markdown files with frontmatter, titles, summaries, headings, bold, lists, and code blocks. Use when user asks to "format markdown", "beautify article", "add formatting", or improve article layout.…
- `skills/baoyu-image-gen/SKILL.md` — **baoyu-image-gen**：AI image generation with OpenAI GPT Image 2, Azure OpenAI, Google, OpenRouter, DashScope, Z.AI GLM-Image, MiniMax, Jimeng, Seedream, Replicate and Agnes APIs. Supports text-to-image, reference images, aspect ratios, and…
- `skills/baoyu-infographic/SKILL.md` — **baoyu-infographic**：Generate professional infographics with 21 layout types and 22 visual styles. Analyzes content, recommends layout×style combinations, and generates publication-ready infographics. Use when user asks to create "infograp…
- `skills/baoyu-markdown-to-html/SKILL.md` — **baoyu-markdown-to-html**：Converts Markdown to styled HTML with WeChat-compatible themes. Supports code highlighting, math, Mermaid (rendered to PNG via headless Chrome), PlantUML, footnotes, alerts, infographics, and optional bottom citations f…
- `skills/baoyu-post-to-wechat/SKILL.md` — **baoyu-post-to-wechat**：Posts content to WeChat Official Account (微信公众号) via API or Chrome CDP. Supports article posting (文章) with HTML, markdown, or plain text input, and image-text posting (贴图, formerly 图文) with multipl…
- `skills/baoyu-post-to-weibo/SKILL.md` — **baoyu-post-to-weibo**：Posts content to Weibo (微博). Supports regular posts with text, images, and videos, and headline articles (头条文章) with Markdown input via Chrome CDP. Use when user asks to "post to Weibo", "发微博", "发布…
- `skills/baoyu-post-to-x/SKILL.md` — **baoyu-post-to-x**：Posts content and articles to X (Twitter). Supports regular posts with images/videos and X Articles (long-form Markdown). In Codex, honor explicit requests for the Codex Chrome plugin/@chrome by using the Chrome Extensi…
- `skills/baoyu-slide-deck/SKILL.md` — **baoyu-slide-deck**：Generates professional slide deck images from content. Creates outlines with style instructions, then generates individual slide images. Use when user asks to "create slides", "make a presentation", "generate deck", "sl…
- `skills/baoyu-translate/SKILL.md` — **baoyu-translate**：This skill should be used when the user asks to "translate", "翻译", "精翻", "translate article", "translate to Chinese", "translate to English", "改成中文", "改成英文", "convert to Chinese", "localize", "…
- `skills/baoyu-url-to-markdown/SKILL.md` — **baoyu-url-to-markdown**：Fetch any URL and convert to markdown using baoyu-fetch CLI (Chrome CDP with site-specific adapters). Built-in adapters for X/Twitter, YouTube transcripts, Hacker News threads, and generic pages via Defuddle. Handles lo…
- `skills/baoyu-wechat-summary/SKILL.md` — **baoyu-wechat-summary**：Summarizes WeChat group chat highlights into a structured digest using the local wx-cli binary (https://github.com/jackwener/wx-cli). Generates a normal digest by default; a roast (毒舌) version is opt-in. Maintains p…
- `skills/baoyu-xhs-images/SKILL.md` — **baoyu-xhs-images**：Generates infographic image card series with 12 visual styles, 8 layouts, and 3 color palettes. Breaks content into 1-10 cartoon-style image cards optimized for social media engagement. Use when user mentions "小红书…
- `skills/baoyu-youtube-transcript/SKILL.md` — **baoyu-youtube-transcript**：Downloads YouTube video transcripts/subtitles and cover images by URL or video ID. Supports multiple languages, translation, chapters, and speaker identification. Caches raw data for fast re-formatting. Use when user as…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.zh.md`
- `package.json`
- `docs/`

## 上游

- https://github.com/JimLiu/baoyu-skills
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
