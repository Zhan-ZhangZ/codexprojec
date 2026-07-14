# Examples-coverage campaign

> 月度 campaign(2026-06-12 启动):把公开 registry 函数的 docstring
> `Examples` 段覆盖率从 35.9% 推向 ≥90%(函数型条目),配合 JOSS 审稿
> (openjournals/joss-reviews#10604,"example usage" 是 checklist 显式条目)。

## Baseline(2026-06-12,v1.17.0)

- 注册符号 1031 个;370 个(35.9%)docstring 带 `Examples` 段。
- 缺口 661 = **421 函数型**(本 campaign 主目标)+ 240 类型(Result 类
  等,deferred tier——多数经函数入口返回,单独示例价值低)。
- 测量工具:`python scripts/examples_coverage.py`(`--missing CAT` 出
  单类清单;`--check --max-missing N` 做 CI ratchet)。
- 完整清单:[worklist.md](worklist.md)(按类分组,checkbox 跟踪)。

## 红线(审稿期间)

1. **只加 docstring,不改任何函数签名/数值行为。**
2. 每条 Example 必须在 `.venv` 下实际运行通过后才能落盘;输出值只在
   固定种子下确定性成立时展示(CI 不收集 doctest,但示例错了被审稿人
   跑出来更糟)。
3. 一律 `import statspai as sp` + `sp.xxx`(CLAUDE.md §4)。
4. Examples 里不引文献;References 段维持现状(§10 零幻觉红线)。
5. 不在 Example 里调用网络 / LLM / R / Stata;只用 numpy/pandas 模拟
   数据或 `sp.datasets` 内置数据。
6. **并行会话协调**:本仓库可能有多个会话同时推进(见 Log 2026-06-12
   条目)。动手前先 `git log --oneline -5` + `git status`,避免重复
   补同一批函数;不要 stash 别人的未提交工作;CHANGELOG.md 有他人
   WIP 时不要并发编辑。

## 批次规划(优先级序)

| # | 范围 | 数量 | 状态 |
| --- | --- | --- | --- |
| 1 | causal 头部:DML 配套 + RD 家族 + matching + DiD/SDID | 28 | ✅ 2026-06-12 |
| 2 | CATE diag + forest + qte + DiD reporting + policy | 32 | ✅ 2026-06-12 |
| 3 | inference/mht + diagnostics + RD 余量 + synth exports | 40 | ✅ 2026-06-12 |
| 4-N | 余下全部(panel/output/decomp/spatial/mendelian/epi/dag/ts/…) | 大批 | ✅ 并行会话 Workflow 扫完 |
| 残余 | agent/core/bayes/neural/result-class/validation 79 个 | 79 | ✅ 2026-06-14 本会话 6 agent |
| 收尾 | runnability 门修复 + ratchet 收紧至 4/0 | — | ✅ 2026-06-14 |

每批交付定义:示例运行验证 → `worklist.md` 勾选 → ratchet 预算下调 →
单独 commit(`docs(examples): batch N — <范围>`)。

## 最终状态(2026-06-14)

- **覆盖率 1031/1031 = 100%**(presence gate `missing=0`)。
- **runnability gate `ran_ok=1018 failed=0`**(每个非 `+SKIP` 示例实跑通过)。
- 两道 CI 闸门预算:`examples_coverage --max-missing 0` +
  `check_example_execution --max-failures 0`。
- 先前停在 4 的那 4 个(`anthropic_client` / `echo_client` /
  `openai_client` / `particle_filter`)**不是 bug**:它们是**有意 submodule-
  scoped**(README 按 `sp.causal_llm.*` / `sp.assimilation.*` 写,集成
  测试也这么用,且 registry-vs-`__all__` 不对称已冻结进
  `tests/test_api_surface_consistency.py` 的 baseline)。agent-native
  契约满足(`sp.describe_function('echo_client')` 正常)。它们一直被算
  "missing" 只是因为旧 scanner 用顶层 `getattr` 够不到 docstring。
- **解法是改 scanner(零审稿影响,不动 API)**:新增
  [`scripts/_resolve.py`](../scripts/_resolve.py) 的 `resolve_registered`,
  两道门都改为按注册名的真实来源解析(顶层 → category 子模块 → 已加载
  `statspai.*` 扫描),从而按实际 docstring 度量。这 4 个本就带 Examples
  → presence 干净到 0;runtime 现在还会实跑 `echo_client` / `particle_filter`
  (两者真可运行),`anthropic_client` / `openai_client` 仍 `+SKIP`。
  未暴露任何缺示例的新符号(当前 resolved=False 的就这 4 个,且全有
  Examples)。**未改任何公开 API、paper、README、计数、frozen baseline。**

## CI ratchet

`parity-guards.yml` 的 registry-drift job 挂两道:
`scripts/examples_coverage.py --check --max-missing 0`(presence)+
`scripts/check_example_execution.py --max-failures 0`(runnability)。
预算只降不升;新注册函数若不带可运行 Examples 会撞门失败。当前预算:
**presence 0 / runnability 0**。

## Log

- **2026-06-12** campaign 启动。扫描器 `scripts/examples_coverage.py`
  落地;baseline 370/1031(缺口 661 = 421 函数型 + 240 类型);
  worklist 生成。同日完成 DML "Spindler 防御":guide
  (`sp_dml_vs_doubleml.md`)新增 "Scope and known limitations" +
  "Companion tooling" 两节、parity 表更新到 1.17.0(4/4 doubleml-for-py
  0.11.3 重验通过,PLR/PLIV 机器精度)、`sp.dml` 双层 docstring Notes、
  registry 增加 multi-instrument failure mode、schema bundle 重生。
  这些编辑由并行会话随其 batch 一起提交(`60a0268`,该 commit 另含
  27 个高频函数的 Examples——与本 campaign 同方向的并行推进)。
- **2026-06-12 batch 1**(本会话):28 个头部因果函数 Examples 全部
  验证落地——DML 配套(dml_sensitivity/dml_diagnostics)+ IV
  (anderson_rubin_ci/iv_compare/kernel_iv/continuous_iv_late)+ RD
  (rdd/rdplotdensity/rdpower/rdsampsi/rdsensitivity/rdbalance/
  rdplacebo/rdsummary)+ matching/weighting(genmatch/optimal_match/
  cardinality_match/ps_balance/overlap_plot/trimming/
  stabilized_weights)+ DiD/SDID/QTE(gardner_did=did_2stage/cic/qdid/
  synthdid_estimate/synthdid_placebo/overlap_weighted_did)。
  缺口 661 → 633;ratchet 预算同步下调。已知边界:cic 与 qdid 的
  `n_boot=0` 会崩(示例用 n_boot=50 规避;修复属数值行为变更,留待
  审稿后走 ⚠️ 流程)。
- **2026-06-12 batch 2**(本会话):32 个名字(31 对象,
  `test_calibration`=`calibration_test` 别名)Examples 落地——CATE 诊断
  (cate_by_group/cate_group_plot/cate_plot/cate_summary/predict_cate/
  gate_test/blp_test)+ metalearner/forest/tmle(focal_cate/cluster_cate/
  auto_cate_tuned/rate/calibration_test/super_learner)+ qte 家族(qte/
  qte_hd_panel/dist_iv/kan_dlate/distributional_te/beyond_average_late)+
  DiD 报告与变体(did_report/did_summary_to_latex/did_summary_to_markdown/
  did_misclassified/ggdid/design_robust_event_study/
  cohort_anchored_event_study/bjs_pretrend_joint)+ policy/bounds 别名
  (policy_tree/partial_identification/policy_value/did_estimate)。
  缺口 633 → 601;ratchet 预算同步下调至 601;覆盖率 35.9% → 41.7%。
  `auto_cate_tuned` 的交互示例行用 `# doctest: +SKIP`(依赖可选
  optuna extra),Examples 段头存在、门通过。
- **2026-06-12 batch 3**(本会话):40 个函数 Examples 落地——多重检验
  (benjamini_hochberg/bonferroni/holm)+ 聚类/wild SE(cr2_se/
  cluster_robust_se/cr3_jackknife_vcov/multiway_cluster_vcov/
  subcluster_wild_bootstrap/wild_cluster_ci_inv)+ 诊断/后估计
  (diagnose_result/estat/evalue_from_result/het_test/reset_test/vif/
  postestimation_contract/margins_at_plot)+ RD 余量(multi_cutoff_rd/
  multi_score_rd/rd_compare/rd_robustness_table/rdbwsensitivity/rdbwhte/
  rdrandinf/rdrbounds/rdwinselect/rd2d/rd2d_bw/rd2d_plot/rd_boost/
  rd_cate_summary/rd_forest/rd_lasso)+ synth 导出/SDID 绘图(synth_to_excel/
  synth_to_markdown/sc_estimate/synthdid_plot/synthdid_rmse_plot/
  synthdid_units_plot/sequential_sdid)。缺口 601 → 561(本会话口径;
  另有并行会话以 `.examples_campaign_wf.js` Workflow 同向推进其它文件,
  ratchet 单调下降、谁低取谁);ratchet 下调至 561;本会话口径覆盖率
  41.7% → 45.6%。wild bootstrap / 置换检验类只展示结构性
  输出(shape/keys),回避跨版本漂移的精确 p 值。
  已知(非本批):`diagnostics/tests.py` 的 `diagnose` 有一个早已存在
  的失败 doctest(缺 import),按 additions-only 原则未动,留待后续
  专门修复。
- **2026-06-14 残余收尾**(本会话,并行会话已扫完中段):用 6 个并行
  agent(按模块分桶、零写竞争)补齐最后 79 个——agent 自省 API
  (registry/help/_agent_docs,真可运行)、core 异常+结果类(try/except
  保证不抛)、bayes 17 个(policy_weights 真可运行,估计器/结果类
  `# doctest: +SKIP` 因 PyMC 不在 env/CI)、neural_causal 13 个(torch
  不在 → 全 +SKIP)、11 个 causal 结果类(从父函数已有示例复制 DGP,真
  可运行)、validation/llm/assimilation/gformula 杂项。**修复运行门 4 个
  真失败**:`sp.tarnet`/`sp.cfrnet`/`sp.dragonnet`(函数版)+ `sp.DeepIV`
  的 `.fit()` 调用先前未加 `+SKIP`,在无 torch 的 `[dev]` CI 里会
  ImportError——已逐行 +SKIP 修复(数据构造行仍真跑)。补 `LLMAnnotatorResult`
  示例(直接构造结果对象,真可运行)。收 14 行 bayes 超 79 字符。
  presence 79 → 4,runnability failed → 0;ratchet 收紧 4/0。
