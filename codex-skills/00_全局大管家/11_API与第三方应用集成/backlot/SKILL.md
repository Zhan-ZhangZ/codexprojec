---
name: backlot
description: "企业 SaaS API 本地模拟器。在本地复现 Slack/Gmail/Drive/GitHub/Jira/Notion/S3
  等平台的响应结构、分页、鉴权、错误与文档级权限——无需厂商账号、无需 OAuth 审批、CI 无密钥、零网络，直接用官方 SDK
  构建与测试集成。Leading Words: API本地模拟, SaaS沙箱, 免账号集成测试, 无网络联调, backlot"
metadata:
  upstream: github.com/brekkylab/backlot
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# backlot

企业 SaaS API 本地模拟器。在本地复现 Slack/Gmail/Drive/GitHub/Jira/Notion/S3 等平台的响应结构、分页、鉴权、错误与文档级权限——无需厂商账号、无需 OAuth 审批、CI 无密钥、零网络，直接用官方 SDK 构建与测试集成。

## 何时使用

适用任务：企业 SaaS API 本地模拟器。在本地复现 Slack/Gmail/Drive/GitHub/Jira/Notion/S3 等平台的响应结构、分页、鉴权、错误与文档级权限——无需厂商账号、无需 OAuth 审批、CI 无密钥、零网络，直接用官方 SDK 构建与测试集成。
相关检索词：Backlot。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/backlot/SKILL.md` — **backlot**：Emulate enterprise SaaS knowledge APIs — Slack, Gmail, Google Drive (with Docs, Sheets, Slides), GitHub, Jira, Confluence, Notion, Amazon S3, HubSpot, Linear, Fireflies — over a corpus you supply, then point a real …

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.pypi.md`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/brekkylab/backlot
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
