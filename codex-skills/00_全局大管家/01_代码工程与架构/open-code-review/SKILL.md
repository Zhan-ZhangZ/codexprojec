---
name: open-code-review
description: "阿里巴巴开源混合架构代码评审工具。确定性流水线 + LLM Agent 双层：精确规则先行、低噪声；Go 单二进制 + GitHub
  Action + VSCode/IDEA 扩展，含评审与委托两个 Agent 技能。Leading Words: 代码评审, PR review,
  AI审阅, 混合架构, 低噪声评审, open code review"
metadata:
  upstream: github.com/alibaba/open-code-review
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# open-code-review

阿里巴巴开源混合架构代码评审工具。确定性流水线 + LLM Agent 双层：精确规则先行、低噪声；Go 单二进制 + GitHub Action + VSCode/IDEA 扩展，含评审与委托两个 Agent 技能。

## 何时使用

适用任务：阿里巴巴开源混合架构代码评审工具。确定性流水线 + LLM Agent 双层：精确规则先行、低噪声；Go 单二进制 + GitHub Action + VSCode/IDEA 扩展，含评审与委托两个 Agent 技能。
相关检索词：OpenCodeReview、阿里代码评审。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/open-code-review/SKILL.md` — **open-code-review**：Performs AI-powered code review on Git changes using the `ocr` CLI from alibaba/open-code-review. Use when the user asks to review code, review a pull request, review staged/unstaged changes, review a commit, or compare…
- `skills/open-code-review-delegate/SKILL.md` — **open-code-review-delegate**：Delegation mode for open-code-review (OCR). Instead of OCR calling an LLM endpoint, this skill instructs the host agent to perform the code review itself, using OCR only for deterministic engineering: file selection and…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `go.mod`
- `package.json`
- `docs/`

## 上游

- https://github.com/alibaba/open-code-review
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
