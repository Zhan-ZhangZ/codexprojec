---
name: AER-Skills
description: "面向 AER、AER: Insights 与 AEJ 的实证经济学投稿技能栈。覆盖选题、文献定位、识别策略、稳健性、正文与引言、表图、复现包、模拟审稿和 R&R 回复。"
metadata:
  upstream: github.com/brycewang-stanford/AER-Skills
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# AER-Skills

这是一套面向 AER、AER: Insights 和 AEJ 系列的实证经济学稿件技能栈。它把识别策略、稳健性、写作、复现和投稿检查组织成按阶段调用的工作流。

## 何时使用

- 评估一个实证经济学选题是否达到 target journal 的门槛。
- 设计或压力测试 DiD、IV、RDD、SCM 等识别策略。
- 检查 AER 体例、复现包、参考文献和投稿材料。
- 模拟审稿并处理 R&R 回复。

这套技能不提供纯理论证明服务；数学推导应使用专门的数学研究技能。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/aer-consistency/SKILL.md` — **aer-consistency**：审计摘要、正文、表格、样本量、单位换算、交叉引用和参考文献之间的一致性。
- `skills/aer-identification/SKILL.md` — **aer-identification**：Use when selecting, implementing, or stress-testing the causal identification strategy for an empirical economics manuscript — difference-in-differences (including staggered designs), instrumental variables (including…
- `skills/aer-introduction/SKILL.md` — **aer-introduction**：Use when drafting or rewriting the introduction of an economics manuscript targeted at AER, AER:Insights, or an AEJ, or when compressing an abstract to the mandatory 100-word limit. Implements the Keith Head / Bellemare…
- `skills/aer-literature/SKILL.md` — **aer-literature**：Use when positioning a manuscript against the existing economics literature, building the antecedents map for the introduction, deciding what to cite, or verifying that every reference in the bibliography is real, corre…
- `skills/aer-paper-body/SKILL.md` — **aer-paper-body**：Use when drafting or revising the body sections of an AER, AER:Insights, or AEJ manuscript — institutional background, data, empirical strategy, results, mechanisms, and conclusion. Covers equation conventions, result…
- `skills/aer-rebuttal/SKILL.md` — **aer-rebuttal**：Use when responding to a Revise & Resubmit decision from AER, AER:Insights, or an AEJ, and a point-by-point response letter plus aligned manuscript revisions are needed. Handles triage, the concede / clarify / push-back…
- `skills/aer-referee-sim/SKILL.md` — **aer-referee-sim**：Use when a complete draft exists and needs an adversarial internal review before submission — simulating the AER desk screen and three referee reports with calibrated severity, scoring the paper against the editorial …
- `skills/aer-replication/SKILL.md` — **aer-replication**：Use when assembling the AEA Data and Code Availability deposit for an AER, AER:Insights, or AEJ acceptance, writing the README, or auditing a replication package before the AEA Data Editor review. Implements the current…
- `skills/aer-robustness/SKILL.md` — **aer-robustness**：Use when the main empirical results exist but the manuscript lacks the robustness, heterogeneity, mechanism, and placebo checks that AER referees will demand. Apply after aer-identification and before aer-introduction s…
- `skills/aer-statspai/SKILL.md` — **aer-statspai**：Use when aer-identification has fixed the design, after methodology choice and before aer-robustness or aer-tables-figures, to run an AER-track analysis with StatsPAI — the agent-native Python engine and MCP server fo…
- `skills/aer-submission/SKILL.md` — **aer-submission**：Use when running the final pre-submission audit for an AER, AER:Insights, or AEJ manuscript — length, format, cover letter, per-author disclosure statements, file packaging, and routing among the AEA journal family. A…
- `skills/aer-tables-figures/SKILL.md` — **aer-tables-figures**：Use when constructing or revising regression tables, descriptive statistics tables, or figures after results are estimated and before submission for an AER, AER:Insights, or AEJ manuscript. Implements AER booktabs house…
- `skills/aer-topic-selection/SKILL.md` — **aer-topic-selection**：Use when evaluating whether a research idea clears the AER top-5 bar, when routing between AER, AER:Insights, and the AEJ family, or when sharpening a fuzzy contribution sentence into one publishable claim. Apply before…
- `skills/aer-workflow/SKILL.md` — **aer-workflow**：Use when deciding which AER-skills sub-skill to use next, before choosing a specialized skill or after a user asks how to sequence manuscript work from topic selection through rebuttal for AER, AER:Insights, or AEJ jour…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.en.md`
- `skills/`
- `templates/`
- `docs/`

## 上游

- https://github.com/brycewang-stanford/AER-Skills

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
