---
name: oh-story-claudecode
description: "Oh Story 核心网文写作工作流套件。涵盖长短篇网络小说的扫榜、拆文、大纲构建、落笔写作及去 AI 味精修全链路。包含多维剧情模块化重组与人机协同。专供长篇或短篇网络小说的高效辅助创作。Leading Words: 网文写作工作流, 长短篇小说创作, 剧情大纲构建, 扫榜拆文逆向"
version: v0.7.9
metadata:
  upstream: github.com/zenstory-ai/oh-story-claudecode
---

# oh-story-claudecode 网文写作技能套件指南

## 1. 核心法则 (Golden Rules)
* **强制前置阅读**：本项目是由 13 个子 skill 组成的多节点网文写作套件（当前 v0.7.9）。执行任何小说创作或逆向任务前，**必须**使用 `view_file` 查阅根目录下的 `README.md`（流程总览 + 各 skill 触发方式），再进入 `skills/<子技能>/SKILL.md` 获取具体作业面。
* **分阶段执行机制**：网络小说创作绝不能"一步到位"。必须严格按照 环境部署(story-setup) -> 扫榜选材(long/short-scan) -> 拆文学习(long/short-analyze) -> 落笔创作(long/short-write) -> 精修定稿(story-deslop) 的生命周期推进；已有成稿走 story-import 逆向导入后再续写。
* **套路与边界准则**：重组大纲与写作必须遵守各 skill `references/` 内的题材卡与门禁约束——v0.7.8 起参考资料按消费者拆分，写正文/短篇构思前有会阻断的 Reference Gate；v0.7.9 起细纲的目标情绪与主角关键选择不接受占位符，短篇按场景功能分配篇幅与节奏。
* **升级即重部署**：hooks / agents / references 由 `story-setup` 部署进写作项目（当前 `agents_version` 29）。套件版本升级后**必须**重跑 `/story-setup` 并新开会话，否则拿到的仍是旧 agent 与旧参考文件。

## 2. 轨迹驱动执行引擎 (Execution Trajectory)
当你接收到撰写小说、分析网文榜单或润色章节的任务时，请依循以下状态机推进：

* **[State: 意图定位与环境探针]**
  * 使用 `view_file` 查阅 `README.md`，确定当前诉求属于哪个阶段（扫榜/拆文/大纲/正文/去AI味/封面），识别长篇（Long）还是短篇（Short）工作流。
  * 初次启动引导 `story-setup` 部署写作项目：8 个自动化 hooks 与 7 个专业 agent（story-architect / character-designer / narrative-writer / consistency-checker / story-researcher / story-explorer / chapter-extractor）；运行时未暴露 custom agent 时按 skill 内约定降级 solo/direct。
* **[State: 子技能分发与执行]**
  * 扫榜：`skills/story-long-scan`（起点/番茄/晋江）、`skills/story-short-scan`（知乎盐言/番茄短篇）；抓取风控数据时配合 `skills/browser-cdp` 复用登录态。
  * 拆文：`skills/story-long-analyze` / `skills/story-short-analyze`，产出拆文库结构化目录（角色/剧情/设定/章节；长篇额外含文风、节奏、情绪模块三份素材），作为写作的对标源数据。
  * 写作：`skills/story-long-write`（大纲/卷纲/细纲/正文，唯一机器字数口径，跨会话作者记忆写入 `.story/作者记忆/`）、`skills/story-short-write`（导语门面、付费点卡脖子断点、知乎/番茄三路基调）。
  * 续写：`skills/story-import` 把已有小说反推为标准工程（正文/大纲/设定/追踪），再接 `story-long-write` 日更。
* **[State: 对话与确认反馈]**
  * 大纲生成后，必须将核心钩子、章节定位（高压/推进/关系/低压）展示给用户确认，确认无误后方可进入正文渲染。
  * 需要本地浏览拆文库与写作项目时，用 `/story dashboard` 打开工作台（仅监听 127.0.0.1，内容不上传）。
* **[State: 精修与审查收口]**
  * 终稿必须经过 `skills/story-deslop` 去AI味精修（本质是写作 lint：blocking 只限确定性句式/标点问题，朱雀等外部检测只作自测参考，不越剧情边界）。
  * 定稿前可用 `skills/story-review` 多视角对抗审查（full/lean 并行，报告头 `Effective Mode` 为注册成功）；封面用 `skills/story-cover` 生成。

## 3. 异常处理模式 (Exception Handling)
* **缺少大纲脉络**：若用户要求直接生成数万字长文，必须强硬中断，退回大纲设计与题材召回流程，强制建立章节结构。
* **部署状态过期**：找不到预期配置文件或 agent 未生效时，提示重跑 `/story-setup` 并新开会话；story-review 报告头出现 `Fallback: ... -> solo` 说明当前运行时未注册 custom agent，属降级而非故障。
* **字数目标非法**：长篇写作缺少合法「字数目标」时停止并追问，不得回退默认值、欠字加戏或注水。
* **样例与变更追查**：需要输出范例时读 `demo/`（长篇拆文《盘龙》、短篇拆文《曾将爱意私藏》、长篇续写工程《让你管账号，你高燃混剪炸全网》、封面《剑道独尊》）；版本行为差异查 `CHANGELOG.md`。
