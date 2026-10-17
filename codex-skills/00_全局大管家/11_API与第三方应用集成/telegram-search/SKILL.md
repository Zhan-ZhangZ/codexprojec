---
name: telegram-search
description: "Telegram 消息搜索引擎。聊天记录语义检索。Leading Words: Telegram搜索, 消息语义检索, 聊天记录搜索"
metadata:
  upstream: github.com/groupultra/telegram-search
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# telegram-search

Telegram 消息搜索引擎。聊天记录语义检索。

## 何时使用

适用任务：Telegram 消息搜索引擎。聊天记录语义检索。
相关检索词：TG搜索。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `.agents/skills/telegram-search-cli/SKILL.md` — **telegram-search-cli**：Operate the Telegram Search CLI through an authorized local profile. Use when an agent needs to discover Telegram chats, read bounded remote messages, explicitly synchronize history with user-approved Telegram Takeout, …

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `package.json`
- `docs/`

## 上游

- https://github.com/groupultra/telegram-search
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
