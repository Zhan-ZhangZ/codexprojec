---
name: octocode-mcp
description: "Agentic 研究平台 MCP。跨仓库检索代码、依赖、引用与上下文，并附带研究、评审和文档工作流。Leading
  Words: GitHub代码检索, agentic研究, 跨仓库分析, octocode"
metadata:
  upstream: github.com/bgauryy/octocode-mcp
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# octocode-mcp

Agentic 研究平台 MCP，提供跨仓库代码检索、依赖与引用分析，以及配套研究和文档工作流。

## 何时使用

适用任务：跨仓库代码检索、调用链与依赖分析、代码评审、研究或文档整理。
相关检索词：Octocode、octocode。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/octocode-brainstorming/SKILL.md` — **octocode-brainstorming**：Use when an idea needs disciplined exploration before building: generate options, test whether it is worth building, map adjacent solutions, challenge assumptions, narrow scope, or choose Build RFC / Prototype / Narrow …
- `skills/octocode-chrome-devtools/SKILL.md` — **octocode-chrome-devtools**：Use when a live page needs Chrome DevTools/CDP evidence: network failures, console errors, performance, DOM/CSS actionability, screenshots/PDF, cookies/storage, click/fill/search, HAR, or auth-gated pages. Phrases like …
- `skills/octocode-documentation/SKILL.md` — **octocode-documentation**：Use when docs are missing, wrong, stale, or badly written, or need a copyedit against the Google style guide: README, API reference, runbook, CONTRIBUTING, changelog, onboarding, AGENTS.md/CLAUDE.md, ADR, migration guid…
- `skills/octocode-graph-eval/SKILL.md` — **octocode-graph-eval**：Use when you need a measurable keep/discard loop — goal→KPI, baseline vs target, held-out checks, eval suites, or don't-stop-till-done against a runnable sensor. Not for ordinary ship checks where 'tests passed' is …
- `skills/octocode-mannequin/SKILL.md` — **octocode-mannequin**：Use when posing, animating, or explaining a 3D human skeleton/manikin: anatomical joints, ROM clamps, walk/run/dance/backflip sequences, Three.js viewer, or agent-driven WebMCP figure control (reach/look_at). Phrases li…
- `skills/octocode-prompt-optimizer/SKILL.md` — **octocode-prompt-optimizer**：Use when an agent prompt, tool schema, policy, or handoff needs to get clearer, safer, easier to trigger, cheaper in context, or measurable against real behavior. For SKILL.md folder install/review/structure, use octoco…
- `skills/octocode-research/SKILL.md` — **octocode-research**：Use when code must be checked, not assumed: trace connections (callers, imports, cross-repo wiring, what breaks if I change it), locate behavior, map a system, diagnose a failure, RCA. Also for external repositories, np…
- `skills/octocode-rfc-generator/SKILL.md` — **octocode-rfc-generator**：Use when a consequential change needs a decision before coding: write or improve an RFC, design doc, architecture proposal, migration plan, option comparison, rollout plan, or measurable implementation contract. If the …
- `skills/octocode-roast/SKILL.md` — **octocode-roast**：Use when code needs a blunt evidence-backed roast or memorable critique: smell inventory, debt ranking, hot-path autopsy, savage/diff review, security or performance sins, or practical redemption paths. Phrases like roa…
- `skills/octocode-scraping/SKILL.md` — **octocode-scraping**：Use when extracting or mapping public web content into a local cited corpus: scrape or crawl a URL/docs site, pull tables/pricing/product fields, diagnose blocked or thin pages, or answer from saved pages. Phrases like …
- `skills/octocode-skills/SKILL.md` — **octocode-skills**：Use when working on Agent Skills (SKILL.md folders): find, compare, rate, review, create, improve, repair, install, or sync skills from local workspaces, registries, or remote sources. For wording-only prompt polish wit…
- `skills/octocode-subagent/SKILL.md` — **octocode-subagent**：Use when spawning workers or offloading work: Task/subagents, specialist handoffs, A2A peers, sealed packets, coordinate/synthesize, challenge techniques (rubber-duck, interview, mimic-flow, red-team, blind review, cons…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `package.json`
- `docs/`

## 上游

- https://github.com/bgauryy/octocode-mcp
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
