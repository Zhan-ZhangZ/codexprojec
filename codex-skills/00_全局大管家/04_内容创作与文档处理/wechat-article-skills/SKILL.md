---
name: wechat-article-skills
description: "微信公众号文章技能集。选题/标题/正文/排版全链路公众号内容生产。Leading Words: 公众号文章, 微信内容创作,
  新媒体写作, wechat article"
metadata:
  upstream: github.com/aiworkskills/wechat-article-skills
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# wechat-article-skills

微信公众号文章技能集。选题/标题/正文/排版全链路公众号内容生产。

## 何时使用

适用任务：微信公众号文章技能集。选题/标题/正文/排版全链路公众号内容生产。
相关检索词：公众号技能。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/aws-wechat-article-assets/SKILL.md` — **aws-wechat-article-assets**：公众号素材｜业务资料库｜预设包｜.aws 预设包｜主题包｜品牌包｜aiworkskills.cn — 用户业务资料库与预设包管理：业务资料按产品名组织在 `.aws-article/products/{产品名}…
- `skills/aws-wechat-article-formatting/SKILL.md` — **aws-wechat-article-formatting**：公众号排版｜Markdown 转 HTML｜排版主题｜段落样式 — 公众号一键排版工具，Markdown 文稿转微信后台可粘贴 HTML，多主题、多字号、段落样式切换，所见即所得。面向公…
- `skills/aws-wechat-article-images/SKILL.md` — **aws-wechat-article-images**：公众号封面｜公众号配图｜公众号插图｜AI 生图 — 公众号 AI 封面与配图生成，按文章标题与内容自动匹配画风，一稿多方案，多风格预设可复用。面向公众号编辑、自媒体、品牌设计。触发词：「封面」「配图」「插图」「生成图片」「给文章加图」「做个封面」「文章插图」「配个图」。不写正文只发一组图请走 aws-wechat-sticker；需要多环节串联（写+审+排+配图+发）请走 aws-wechat-article-main。
- `skills/aws-wechat-article-main/SKILL.md` — **aws-wechat-article-main**：公众号运营｜微信公众号｜公众号一条龙｜公众号全流程｜自媒体运营｜wechat automation｜content pipeline｜AIGC workflow — 公众号一条龙运营总控入口，选题→写稿→审稿→…
- `skills/aws-wechat-article-publish/SKILL.md` — **aws-wechat-article-publish**：公众号发布｜公众号草稿箱｜公众号群发｜图文推送｜微信 API｜wechat automation｜WeChat API automation｜auto publish｜scheduled publish — 公众号 API 发布工具，图文入草稿箱或直…
- `skills/aws-wechat-article-review/SKILL.md` — **aws-wechat-article-review**：公众号审稿｜公众号校对｜敏感词检测｜内容合规 — 公众号发布前合规审查：敏感词扫描、错别字检测、政治合规、平台规范校验，一次性输出修改清单。面向公众号编辑、自媒体作者、合规岗。触发词：「审稿」「审核」「校对」「合规」「敏感词」「错别字」「稿子检查一下」「稿子帮我看看」「稿子写完了」「文章检查一下」「检查下有没有问题」「能不能发」「发布前检查」。需要多环节串联（写+审+排+配图+发）请走 aws-wechat-article-main。
- `skills/aws-wechat-article-topics/SKILL.md` — **aws-wechat-article-topics**：公众号选题｜爆款标题｜热点追踪｜系列策划 — 公众号 AI 选题与标题生成，覆盖热点调研、选题策划、起标题、写摘要、系列排期。面向自媒体编辑、内容运营。触…
- `skills/aws-wechat-article-writing/SKILL.md` — **aws-wechat-article-writing**：公众号写稿｜长文写作｜文章润色｜改写续写 — 公众号长文 AI 写作，从话题或提纲生成完整初稿，支持改写、续写、润色、开头结尾优化，可调 DeepSeek / GPT / Claude …
- `skills/aws-wechat-sticker/SKILL.md` — **aws-wechat-sticker**：公众号贴图｜九宫格｜多图推送｜图片消息｜表情包 — 贴图与多图推送：从创意构思、规划图序、AI 生图到整组图审核，产出一组风格统一的图片 + 每张配文。发布…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README_EN.md`

## 上游

- https://github.com/aiworkskills/wechat-article-skills
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
