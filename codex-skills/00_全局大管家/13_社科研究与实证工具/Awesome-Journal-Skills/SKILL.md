---
name: Awesome-Journal-Skills
description: Top Journals (AER/QJE/Nature 等) 顶刊定制化投稿格式降维重塑器。预置全球顶级期刊极为严苛的排版规则、引用规范及图表阈值，一键接管原稿并暴力转换为可直接 Submission 的终稿。Leading Words: Nature/AER/QJE顶刊投稿降维重塑, 严苛期刊排版引用规范预置, 暴力转换Submission终稿生成, 学术投稿格式强制校验
---

# Awesome-Journal-Skills

期刊与会议专用投稿技能总库（Stanford REAP × CoPaper.AI 维护，上游 brycewang-stanford/Awesome-Journal-Skills，2026-08-26 快照）。覆盖 744 个期刊/会议 venue、约 4166 个 Agent Skill、300 个技能包，按 11 个学科板块组织：综合·交叉、经管与商科、社会科学、人文学科、数学与物理科学、生命科学、医学与健康、工程与技术、计算机科学与 AI、农业·环境·地球科学、体育科学。

## 核心能力

- 顶刊格式重塑：AER/QJE/Nature/Cell/管理世界/经济研究 等深度包（depth pack）内置投稿全生命周期技能栈——选题定位、识别策略、实验设计、表格图表规范、行文风格、审稿回复（rebuttal/author response）、camera-ready 收尾。
- 官方来源核对：每个深度包 resources 目录下的官方来源核对表 official-source-map.md 经过在线核验，供稿式排版规则、字数/图表阈值、匿名要求等均可溯源。
- 期刊匹配检索：`catalog.json` / `CATALOG.md` 为全量 venue 索引（coverage/lane/tier/region/install），配合 `Research-Toolkit-Skills` 的 `rt-journal-match` 可按论文画像给出 reach/match/safe 冲稿梯度与转投阶梯。
- 实证方法资产：`shared-resources/` 提供计量方法（econometrics-methods）、实证方法（empirical-methods）、ML 会议方法（ml-conference-methods）、投稿就绪度（submission-readiness）与期刊选题数据（journal-selection）五大共享资源层。
- 可复现案例：`showcase/` 内置 RDD、IV、DML、DiD、SCM 五类经典实证设计的完整复现案例。

## 使用方式

1. 查 `CATALOG.md`（人读）或 `catalog.json`（机读）定位目标期刊/会议，得到对应技能包目录名与 lane（empirical/theory/review/qualitative）。
2. 进入对应 `*-Skills/` 目录：`skills/` 下是各阶段技能（每个子目录一个 SKILL.md），`resources/` 是模板、范例与官方来源核对表，`code/` 是 Stata/Python 代码骨架。
3. 将原稿交给目标期刊的 submission 技能，按其 checklist 与 manuscript_template 强制校验排版、引用与图表阈值，产出可直接 Submission 的终稿。
4. 审稿阶段改用 revision/rebuttal/author-response 技能处理逐条回复与策略取舍。

## 集成说明

本次为覆盖集成（2026-09-03）：新增约 110 个 CS 会议（ICSE/CVPR/ACL/SIGIR 等）与中文期刊技能包，633 个共有文件内容更新，`proghg-*` 技能重构为 `phg-*`。瘦身剔除上游 CI（.github）、tests、散布的 .gitignore 与社媒宣传截图（社媒文件/），保留全部技能资产、期刊清单（CATALOG.md/catalog.json/.maintenance/JOURNAL-MASTER-LIST.md）与 showcase 案例库。
