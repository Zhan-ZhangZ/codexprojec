---
name: obsidian-skills
description: "Obsidian 官方 Agent Skills 套件。6 个子技能：defuddle 网页正文提取、json-canvas
  画布格式、knap 快照调度、obsidian-bases 多库管理、obsidian-cli 官方 CLI、obsidian-markdown
  链接与元数据规范；Obsidian 插件市场一键安装。Leading Words: Obsidian官方技能, 笔记库自动化, json canvas,
  obsidian cli, 双链笔记, 知识管理"
metadata:
  upstream: github.com/kepano/obsidian-skills
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# obsidian-skills

Obsidian 官方 Agent Skills 套件。6 个子技能：defuddle 网页正文提取、json-canvas 画布格式、knap 快照调度、obsidian-bases 多库管理、obsidian-cli 官方 CLI、obsidian-markdown 链接与元数据规范；Obsidian 插件市场一键安装。

## 何时使用

适用任务：Obsidian 官方 Agent Skills 套件。6 个子技能：defuddle 网页正文提取、json-canvas 画布格式、knap 快照调度、obsidian-bases 多库管理、obsidian-cli 官方 CLI、obsidian-markdown 链接与元数据规范；Obsidian 插件市场一键安装。
相关检索词：Obsidian 官方技能、obsidian。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/defuddle/SKILL.md` — **defuddle**：Extract clean Markdown from HTML pages with Defuddle CLI.
- `skills/json-canvas/SKILL.md` — **json-canvas**：Create and edit JSON Canvas files (.canvas) with nodes, edges, groups, and connections. Use when working with .canvas files, creating visual canvases, mind maps, flowcharts, or when the user mentions Canvas files in Obs…
- `skills/knap/SKILL.md` — **knap**：Render Markdown from templates and structured data using Knap CLI. Use when the user asks to apply a Knap template, turn JSON or CSV data into notes, batch-generate Markdown files, or format Defuddle output into a note.
- `skills/obsidian-bases/SKILL.md` — **obsidian-bases**：Create and edit Obsidian Bases (.base files) with views, filters, formulas, and summaries. Use when working with .base files, creating database-like views of notes, or when the user mentions Bases, table views, card vie…
- `skills/obsidian-cli/SKILL.md` — **obsidian-cli**：Interact with Obsidian vaults using the Obsidian CLI to read, create, search, and manage notes, tasks, properties, and more. Also supports plugin and theme development with commands to reload plugins, run JavaScript, ca…
- `skills/obsidian-markdown/SKILL.md` — **obsidian-markdown**：Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Use when working with .md files in Obsidian, or when the user mentions wikilinks, callouts, fr…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`

## 上游

- https://github.com/kepano/obsidian-skills
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
