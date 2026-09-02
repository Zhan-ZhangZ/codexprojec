---
name: StatsPAI
description: 因果推断 (Causal Inference) 与高阶计量经济学 Agent-native Python 引擎 (StatsPAI)。将双重差分 (DID)、断点回归 (RDD) 融合成强制结构化 API 输出，实现智能体驱动的自动化政策评估体系。Leading Words: StatsPAI因果推断计量经济学, DID双重差分RDD断点回归, 智能体自动化政策评估, 结构化API因果挖掘
metadata:
  version: 1.23.0
  upstream: github.com/brycewang-stanford/StatsPAI
---

# StatsPAI

Agent-native 因果计量 Python 库，统一 API + 结构化输出

## 基本信息

- **上游仓库**: https://github.com/brycewang-stanford/StatsPAI
- **当前版本**: v1.23.0（2026-08-24 release「JOSS review archive」，MIT License）
- **安装方式**: `pip install statspai`（PyPI 分发；本技能只收录其文档层，源码与测试不随包分发，需要时按 GitHub 定 tag 链接查阅）
- **规模**: 1,178 个注册函数 / 87 个子模块；Stata/R 双语迁移导向（`regress`/`reghdfe`/`csdid`/`rdrobust`/`synth`/`psmatch2` ↔ `fixest`/`did`/`DoubleML`/`MatchIt`）

## 本技能收录内容

- `README.md` / `README_CN.md` — 项目总览、安装、Stata/R 对照速查、入门示例
- `docs/getting-started.md`、`docs/cookbook.md`、`docs/faq.md` — 上手与菜谱
- `docs/guides/` — 70+ 方法说明文档（callaway_santanna、honest_did、各类 DID/RD/IV/匹配/DML/分解/流行病学/因果 ML 选型指南，高价值保留项）
- `docs/reference/` — 按方法族的 API 参考（did/rd/iv/matching/dml/decomposition/survival 等）
- `schemas/` — 机器可读函数/工具/Agent 卡片目录与结果对象 JSON Schema（`functions.json`、`tools.json`、`agent_cards.json`、`result.schema.json`），供 Agent 结构化路由与输出校验
- `examples/` — 可运行示例脚本与 notebook（Card IV、DID mpdta、RD Lee、Synth Prop99、DML 等）
- `StatsPAI_full_data_analysis_skill/` — 上游自带的实证分析全流程子技能入口（AER/QJE 体例流水线、流行病学 pipeline、因果 ML、分解族、回归表导出）
- `MIGRATION.md` — 版本迁移与行为变更权威说明；`CHANGELOG.md` — 逐版本变更
- `mkdocs.yml` — 文档站导航配置

## v1.20.0 → v1.23.0 关键变化（⚠️ 影响既有结论，需重跑）

1. **`sp.did_imputation` 解析标准误重大修正（v1.23.0）**：旧实现用平衡面板份额近似固定效应投影，headline ATT 标准误偏小最多 36%；现按 BJS 精确方差计算，与 Stata/R 参照一致至 ~5e-8。前置趋势事件研究系数新增 `pretrend_method=`（默认 `'bjs'`，对齐 Stata `did_imputation, pretrends(k)`）。
2. **`sp.did(..., weights=)` 静默失效修复（v1.23.0）**：交错采纳路径此前从不转发权重（ω 进入估计目标定义，符号都可能翻转）；`sp.callaway_santanna` 现全程实现 ω，未实现权重的方法改为显式报错。
3. **`sp.aggte` / `sp.callaway_santanna` 标准误修正（v1.22.0）**：聚合权重按估计所得队列份额处理，剔除权重估计影响项导致 SE 偏小最多 8.4%（点估计不受影响）；现与 R `did` 一致。
4. **`sp.cardinality_match` 改为精确 MILP 求解（v1.22.0）**：旧 LP 舍入违反 SMD 容忍约束，匹配集与效应估计改变；新增 `time_limit`，不可行请求显式报错。
5. **DID_M 族修复（v1.21.0）**：`sp.did_multiplegt` 动态效应/安慰剂三处缺陷修复并新增 `placebo_sign=` 约定选择；`sp.did_multiplegt_dyn` 正确处理 switch-off 事件；`sp.continuous_did(method="cgs")` 弃用，改用 `sp.cgs_continuous_did`。
6. **接口契约收紧（v1.21.0/1.22.0）**：8 处 bool 型 `robust=` 拒绝字符串形式（旧版 `robust="cluster"` 被真值化而静默返回未聚类 SE）；回归表 `fmt="auto"` 精度按系数-SE 配对选取，p 值下限显示 `<0.001`。

## Agent 使用路径

1. 实证分析全流程（论文体例表/图/稳健性）：读 `StatsPAI_full_data_analysis_skill/SKILL.md`。
2. 方法选型与参数细节：查 `docs/guides/`（如 `choosing_did_estimator.md`、`callaway_santanna.md`）与 `docs/reference/`。
3. 函数发现与输出契约：用 `schemas/functions.json`（全函数目录）、`schemas/result.schema.json`（结构化结果）。
4. 跨版本结果比对：先查 `MIGRATION.md` 对应小节。
