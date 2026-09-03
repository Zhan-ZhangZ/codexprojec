---
name: auto-empirical-research-skills
description: Route empirical-research requests through the Auto-Empirical Research Skills catalog when this whole repository is installed as one skill in Codex, CodeBuddy, Claude Code, or another IDE. Use to choose and load the right vendored AERS skill for causal inference, econometrics, replication, data acquisition, manuscript writing, peer review and referee responses, citation checking, de-AIGC editing, or full empirical-paper workflows without reading the entire repository at once.
license: CC-BY-SA-4.0
---

# Auto-Empirical Research Skills 路由器

当整个 AERS 仓库作为单个技能文件夹安装时，使用本根技能。把它当作路由器与目录索引，而不是一次性读取全部内嵌子技能的 `SKILL.md`。

目录收录 **76 个内嵌合集、共 1,096 个技能**。绝不整库通读——先路由到其中一个，再只加载该技能的 `SKILL.md`。

## 工作流程

1. 按研究阶段对用户的实证研究任务分类，然后加载唯一最匹配的技能：
   - 全流程 / 总编排：从 `skills/69-Paper-WorkFlow/`（论文全流程总编排器）或四个旗舰分析技能入手——`skills/00-Full-empirical-analysis-skill_StatsPAI/`（StatsPAI）、`skills/00.1-Full-empirical-analysis-skill_Python/`（Python）、`skills/00.2-Full-empirical-analysis-skill_Stata/`（Stata）、`skills/00.3-Full-empirical-analysis-skill_R/`（R）。注意 StatsPAI 旗舰目录前缀没有点号，用 `skills/00.*` 通配会漏掉它。
   - 因果推断与计量经济学：按方法从下表选取，或检索 `catalog/skills.json` 与 `docs/TAXONOMY.md`。
   - AER 或顶级经济学期刊工作：从 `skills/50-brycewang-aer-skills/` 入手。
   - 复现、引文核查、同行评审：用 `docs/SKILL_CATALOG.md` 与 `docs/GOLDEN_WORKFLOWS.md` 选取聚焦技能。
   - 学术去 AI 化（中英文）或学术改写：从 `skills/48-de-AIGC-skills/` 或目录中相邻的写作技能入手。
2. 只读取所选子技能的 `SKILL.md`，再按其渐进披露指引加载 `references/`、`scripts/`、`assets/` 或模板。
3. 若无子技能明显匹配：先查 `catalog/skills.json`（含 `path`、`name`、`description`、`line_count` 与全局唯一 `qualified_name`），再查 `docs/SKILL_CATALOG.md`。需要更丰富的筛选维度（主题 `tags`、`quality_score`、`license`、`commercial_use`）时用 `catalog/skills-enriched.json`。避免对 `skills/` 做宽泛的递归读取。
   - 两份目录 JSON 都很大（各约 1 MB / 2 万行）——应当查询而不是整读。示例：

     ```bash
     python3 -c "import json; [print(s['qualified_name'], '->', s['path']) for s in json.load(open('catalog/skills.json'))['skills'] if 'synthetic control' in (s['name'] + ' ' + s['description']).lower()]"
     ```

     只需粗略匹配时，`grep -in "synthetic control" catalog/skills.json` 也够用。
4. 安装帮助：Codex 式拷贝安装见 `docs/INSTALL.md`；Claude Code marketplace / plugin 安装见 `INSTALL.md`。
5. 若要编辑本仓库内容，保持父仓库与嵌套仓库相互独立。特别是改动 `skills/69-Paper-WorkFlow/`（上游为 git 子模块）前，先在其中查看 `git status`。

## 方法 → 从哪里入手

把用户的识别策略或任务匹配到起始合集，再对照 `catalog/skills.json` 确认。

本表只是最常用切入点的速查，**不是完整索引**——表内命名的合集不足全部合集的一半，其余只能通过 `catalog/skills.json` 检索。表里没有的任务不代表没有对应技能：回落到工作流程第 3 步，先检索目录再下结论。

| 任务 / 方法 | 从这里入手 |
|---|---|
| 完整论文流水线（总编排器） | `skills/69-Paper-WorkFlow/` |
| **数据 → 完整 Word `.docx` 手稿**（一次运行：分析 + 写作 + 成品组装） | `skills/69-Paper-WorkFlow/`——交付物为 Word 时在其阶段 0 选 `manuscript.format = markdown`；阶段 9 组装出 `demo-notebooks/_manuscript_docx_demo/09_submission/main.docx`（正文 + 表格 + 图 + 参考文献，一整个文件），并做数字溯源门控 |
| 仅 Markdown / LaTeX → `.docx` 格式转换（不含分析） | `skills/67-econfin-workflow-toolkit/md-to-docx/`、`skills/08-ndpvt-web-latex-document-skill/` |
| Agent 原生因果分析（一次调用跑 DiD / RD / IV / SCM / DML，自动稳健性门控） | `skills/00-Full-empirical-analysis-skill_StatsPAI/` |
| DiD / 交错 DiD / 事件研究 | `skills/50-brycewang-aer-skills/`、`skills/10-Jill0099-causal-inference-mixtape/`、`skills/13-scunning1975-MixtapeTools/` |
| 工具变量（IV） | `skills/50-brycewang-aer-skills/`、`skills/40-py-econometrics-pyfixest/` |
| 断点回归（RDD） | `skills/50-brycewang-aer-skills/`、`skills/10-Jill0099-causal-inference-mixtape/` |
| 合成控制（SCM） | `skills/50-brycewang-aer-skills/`、`skills/13-scunning1975-MixtapeTools/` |
| 面板固定效应 | `skills/40-py-econometrics-pyfixest/`、`skills/39-vincentarelbundock-marginaleffects/` |
| 匹配 / 倾向得分 | `skills/10-Jill0099-causal-inference-mixtape/`、`skills/11-James-Traina-compound-science/` |
| 结构估计（含 BLP 需求估计） | `skills/11-James-Traina-compound-science/`、`skills/14-luischanci-claude-code-research-starter/` |
| 时间序列 / 预测 | `skills/17-DAAF-Contribution-Community-daaf/`、`skills/43-wentorai-research-plugins/` |
| 文本即数据 / NLP | `skills/43-wentorai-research-plugins/` |
| 空间 / GIS 分析 | `skills/17-DAAF-Contribution-Community-daaf/`、`skills/43-wentorai-research-plugins/` |
| 实验 / RCT 设计 | `skills/11-James-Traina-compound-science/`、`skills/25-HosungYou-Diverga/` |
| 问卷调查设计 | `skills/43-wentorai-research-plugins/`、`skills/25-HosungYou-Diverga/` |
| DML / CATE / 因果森林 | `skills/00.1-Full-empirical-analysis-skill_Python/`、`skills/63-tondevrel-scientific-agent-skills/` |
| 贝叶斯建模 | `skills/23-Learning-Bayesian-Statistics-baygent-skills/`、`skills/51-pymc-labs-CausalPy/` |
| Python 分析（全流程） | `skills/00.1-Full-empirical-analysis-skill_Python/`、`skills/40-py-econometrics-pyfixest/` |
| Stata 分析 | `skills/00.2-Full-empirical-analysis-skill_Stata/`、`skills/32-dylantmoore-stata-skill/`、`skills/64-tmonk-mcp-stata/` |
| R 分析 | `skills/00.3-Full-empirical-analysis-skill_R/`、`skills/55-ab604-claude-code-r-skills/` |
| 博弈论 / 理论论文 | `skills/65-game-theory-paper-writer/` |
| 质性 / 主题分析 | `skills/53-keemanxp-thematic-analysis-skill/` |
| 数据获取（Kaggle、SEC 文件、开放数据） | `skills/72-kaggle-research/`、`skills/57-dgunning-edgartools/`、`skills/59-shiquda-openalex-skill/` |
| 文献综述 | `skills/36-taoyunudt-literature-review-skill/`、`skills/52-keemanxp-slr-prisma/`、`skills/59-shiquda-openalex-skill/` |
| 综述工具挑选 / PDF 转 Markdown / PDF 引文问答 / PRISMA 筛选执行器 | `skills/71-brycewang-lit-review-agent-tools/` |
| 引文核查 | `skills/62-PHY041-claude-skill-citation-checker/` |
| 手稿写作 / 校对 | `skills/04-K-Dense-AI-claude-scientific-writer/`、`skills/38-peternka-academic-proofreader/` |
| 同行评审 / 审稿报告 / 回复审稿人 | `skills/21-claesbackman-AI-research-feedback/`、`skills/12-pedrohcgs-claude-code-my-workflow/`、`skills/67-econfin-workflow-toolkit/` |
| LaTeX / Quarto 编译、幻灯片 | `skills/08-ndpvt-web-latex-document-skill/`、`skills/60-regisely-superpapers/`、`skills/12-pedrohcgs-claude-code-my-workflow/` |
| 去 AI 化 / 人性化改写 | `skills/48-de-AIGC-skills/`、`skills/45-stephenturner-skill-deslop/`、`skills/47-conorbronsdon-avoid-ai-writing/` |
| 中文 SSCI/CSSCI 期刊润色 | `skills/70-ssci-polish/`、`skills/49-voidborne-d-humanize-chinese/` |
| 复现 | `skills/28-maxwell2732-paper-replicate-agent-demo/`、`skills/29-quarcs-lab-project20XXy/` |
| 开放科学 / 可复现性 | `skills/54-scdenney-open-science-skills/`、`skills/29-quarcs-lab-project20XXy/` |
| 基金申请 / 课题申报 | `skills/42-wanshuiyin-ARIS/`、`skills/43-wentorai-research-plugins/` |
| 会议海报 / 录用后事宜 | `skills/42-wanshuiyin-ARIS/`、`skills/33-Galaxy-Dawn-claude-scholar/` |

## 全流程触发

若用户要求从想法到投稿的完整实证论文，路由到 `skills/69-Paper-WorkFlow/`。总编排器在各阶段加载合适的技能，并在两道硬门处停下等待人工决策（阶段 3 后的方法门 Method Gate、阶段 7 后的草稿质量门 Draft Quality Gate）。

触发语（任一即应派发给总编排器）：

- `/paper-workflow`
- “帮我写一篇实证论文”
- “从选题到投稿”
- “从数据到 docx 论文全文” / “一条龙” / “出一份 Word 版论文”
- “end-to-end empirical paper”
- “from proposal to submission”
- “raw data to a finished Word manuscript”

总编排器**不是**单点任务的正确入口（如“跑一个 DiD”“重编码这个变量”“写一份审稿报告”）——这些见上面的方法速查表。

## 覆盖说明

- `skills/69-Paper-WorkFlow/` 在上游是 git 子模块；本集成副本已将其实质内容直接落盘（非子模块）。若该文件夹为空，说明拷贝或克隆时跳过了子模块（克隆场景用 `git submodule update --init` 修复）；此时回落到直接内嵌的 `skills/00` 系列旗舰流水线技能——它们止步于可发表的表格与图，外加一个 Step 8.5 交接契约（`exhibits_index.md` 与 `results_summary.json`），需再配一个写作技能完成手稿本身，因为组装并门控完整 `.docx` 的能力在总编排器里。
- 数据到 Word 手稿的完整演示见 `demo-notebooks/manuscript_docx_demo.py`：它对已提交的 LaLonde NSW 管线产物跑“最后一跳”，用 `check_manuscript_numbers.py` 把成品 `.docx` 里引用的每个数字重新溯源到分析产物，对不上即拒绝。
- 内嵌 ARIS 合集（`skills/42-wanshuiyin-ARIS/`）同时以 OpenAI Codex CLI 运行时移植版（`skills-codex` 子树）形式随附。这些文件保留在磁盘上，但被 `catalog/skills.json` 排除在外（见 `scripts/skill_discovery.py`）——路由 Claude 类 agent 时只走主 `skills/` 树。
- 基准与信任面（2026-09 扩充）：数值基准 `benchmark/README.md` 新增结构需求估计（BLP）与干扰 / 溢出（SUTVA）两个方法族，共 19 族 18 族全覆盖；第三方 agent 可通过 `aers_score/README.md` 的 `aers-score` 命令行在同一场考试上应考，成绩榜见 `docs/EXTERNAL_SCOREBOARD.md`。

## 安装说明

- 整库导入由本根 `SKILL.md` 作为轻量兼容入口支持。
- 当运行时要求“一个文件夹一个技能”时，仍优先安装单个技能：直接拷贝包含目标 `SKILL.md` 的那个文件夹。
- 不要把仓库根拷进运行时就指望每个子技能被逐一注册，除非该运行时显式支持递归技能发现。
- **重名冲突**：目录中有 47 个跨合集共享的裸 `name`（如 `data-analysis`、`lit-review`、`proofread`）。运行时按扁平名注册技能时，请一次安装一个合集，或用 `catalog/skills.json` 中全局唯一的 `qualified_name` 字段（`<合集>::<name>`，如 `12-pedrohcgs-claude-code-my-workflow::data-analysis`）或完整 `skills/<collection>/.../SKILL.md` 路径消歧。

## 关键文件

- `catalog/skills.json`：机器可读的内嵌技能清单。
- `catalog/skills-enriched.json`：同一清单外加 `tags`、`quality_score`、`license`、`commercial_use` 筛选字段。
- `docs/SKILL_CATALOG.md`：人类可读的技能索引。
- `docs/TAXONOMY.md`：任务与方法分类法。
- `docs/GOLDEN_WORKFLOWS.md`：即用的实证研究提示词。
- `docs/INSTALL.md`：单技能与整库两种用法的运行时安装指引。
- `docs/CONTENT_ZH.md` 与 `README-zh-CN.md`：中文合集索引与中文入口。用户以中文工作时优先用这两份——若干合集（去 AI 化、SSCI/CSSCI 润色、中文学术写作）在中文文档里的说明比英文文档更细。
