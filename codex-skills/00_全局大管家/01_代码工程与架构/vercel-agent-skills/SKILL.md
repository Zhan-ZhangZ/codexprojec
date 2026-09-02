---
name: vercel-agent-skills
description: Vercel 官方标准的前端项目质检探针。专门针对 React / Next.js 等 Web 应用进行深度体检，全面覆盖页面性能优化（Web Vitals）、DOM结构合理性、无障碍访问（Accessibility/a11y）以及现代前端工程最佳实践规范。Leading Words: Vercel前端规范, React性能优化, 网页可访问性 a11y, Web Vitals, Next.js最佳实践
metadata:
  version: "2026-08-28"
  upstream: github.com/vercel-labs/agent-skills
---

# vercel-agent-skills

- **项目主页**: https://github.com/vercel-labs/agent-skills
- **技能来源**: Vercel 官方集合仓（skills.sh: https://skills.sh/vercel-labs/agent-skills ），本目录版本对齐上游 2026-08-28 提交

## 功能说明

Vercel 官方的 AI 编码代理技能集合仓。官方按三大板块组织：**React**（界面质量与性能）、**Vercel**（部署与项目优化）、**Design**（UI/文案审查）。本仓库保留其 `skills/` 全部 9 个子技能目录，供 Agent 按需读取执行。

## 子技能清单（skills/）

### React 板块
| 子技能 | 用途 |
|---|---|
| `react-best-practices` | React / Next.js 性能优化规范（编写、评审、重构时使用；完整规则见其 `AGENTS.md` 与 `rules/`） |
| `composition-patterns` | React 组合模式（复合组件、render props、Context、可复用 API 设计，含 React 19 变化） |
| `react-view-transitions` | 用 View Transition API 实现原生流畅的页面过渡（`<ViewTransition>`、CSS recipes、Next.js 集成、troubleshooting） |
| `react-native-skills` | React Native/Expo 移动端最佳实践（列表性能、动画、原生模块） |

### Vercel 板块
| 子技能 | 用途 |
|---|---|
| `deploy-to-vercel` | 一句话部署应用到 Vercel（"deploy my app" 等；脚本在 `resources/`） |
| `vercel-cli-with-tokens` | 用 Access Token（非交互登录）操作 Vercel CLI 部署与管理项目 |
| `vercel-optimize` | 对已部署项目做成本与性能优化体检（采集 Vercel 指标→门禁评分→生成优化建议；自带 `lib/`、`scripts/`、`references/`） |

### Design 板块
| 子技能 | 用途 |
|---|---|
| `web-design-guidelines` | 按 Web Interface Guidelines 审查 UI 代码（"review my UI"、可访问性、设计审计） |
| `writing-guidelines` | 按写作规范审查文档/文案（语气、文风、表达） |

## 使用方式

各子技能目录自带 `SKILL.md` 入口（含触发条件与执行步骤），直接阅读对应子技能的 `SKILL.md` 即可开始；多数子技能另附编译版 `AGENTS.md` 全文（单文件形态）与 `references/` 分层资料。

## 详细指南

集合仓总览见本地 [README.md](./README.md)；各子技能细节以其目录内 `SKILL.md` 为准。
