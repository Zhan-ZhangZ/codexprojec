---
name: agent-rules-books
description: "智能体规则书库。按语言/框架组织的编码规则书，供 agent 加载遵循。Leading Words: 规则书, 编码规范,
  agent rules, 语言规则库"
metadata:
  upstream: github.com/ciembor/agent-rules-books
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# agent-rules-books

智能体规则书库。按语言/框架组织的编码规则书，供 agent 加载遵循。

## 何时使用

适用任务：智能体规则书库。按语言/框架组织的编码规则书，供 agent 加载遵循。
相关检索词：规则书库。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `a-philosophy-of-software-design/SKILL.md` — **a-philosophy-of-software-design**：Apply John Ousterhout-inspired software design rules when reducing complexity, designing module boundaries, or reviewing APIs and abstractions.
- `clean-architecture/SKILL.md` — **clean-architecture**：Apply Robert C. Martin-inspired architecture rules when separating business policy from frameworks, databases, UI, or infrastructure details.
- `clean-code/SKILL.md` — **clean-code**：Apply Robert C. Martin-inspired clean code rules when improving readability, naming, function design, responsibilities, or testable everyday code.
- `code-complete/SKILL.md` — **code-complete**：Apply Steve McConnell-inspired construction rules when implementing routines, variables, classes, control flow, defensive code, or tests.
- `designing-data-intensive-applications/SKILL.md` — **designing-data-intensive-applications**：Apply Martin Kleppmann-inspired data-system rules when designing reliability, scalability, consistency, replication, transactions, streams, or schema evolution.
- `domain-driven-design/SKILL.md` — **domain-driven-design**：Apply Eric Evans-inspired DDD rules when modeling a complex domain, defining bounded contexts, protecting ubiquitous language, or designing aggregates.
- `domain-driven-design-distilled/SKILL.md` — **domain-driven-design-distilled**：Apply Vaughn Vernon-inspired lightweight DDD rules when using bounded contexts, subdomains, context maps, and tactical modeling without excess ceremony.
- `implementing-domain-driven-design/SKILL.md` — **implementing-domain-driven-design**：Apply Vaughn Vernon-inspired implementation DDD rules when building aggregates, domain events, repositories, application services, or context integrations.
- `patterns-of-enterprise-application-architecture/SKILL.md` — **patterns-of-enterprise-application-architecture**：Apply Martin Fowler-inspired enterprise architecture rules when choosing layers, service layers, transaction scripts, domain models, repositories, mappers, or DTOs.
- `refactoring/SKILL.md` — **refactoring**：Apply Martin Fowler-inspired refactoring rules when improving existing code structure while preserving observable behavior.
- `refactoring-guru/SKILL.md` — **refactoring-guru**：Apply Refactoring.Guru-inspired rules when diagnosing code smells, choosing refactoring techniques, and stopping cleanup before uncontrolled redesign.
- `release-it/SKILL.md` — **release-it**：Apply Michael T. Nygard-inspired production reliability rules when designing failure handling, timeouts, retries, circuit breakers, observability, or deployment behavior.
- `the-pragmatic-programmer/SKILL.md` — **the-pragmatic-programmer**：Apply Hunt and Thomas-inspired pragmatic programming rules when improving engineering judgment, feedback loops, DRY knowledge, orthogonality, automation, or adaptability.
- `working-effectively-with-legacy-code/SKILL.md` — **working-effectively-with-legacy-code**：Apply Michael Feathers-inspired legacy-code rules when changing hard-to-test code safely with characterization tests, seams, sprout methods, or wrap methods.

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `docs/`

## 上游

- https://github.com/ciembor/agent-rules-books
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
