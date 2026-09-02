---
name: nature-skills
description: 面向全球学者的科研大航海全家桶 (nature-skills)。汇集 16+ 个强力学术 Agent 技能，全面覆盖文献检索、论文精读、引用审计、科研写作至审稿模拟的全链路周期，直接赋能科研攻坚与核心痛点。Leading Words: 全栈科研学术全家桶, 文献检索与精读, Nature级论文写作, 引用审计与审稿模拟
---

# Nature Skills

面向全球学者的科研 Skill 库。
该技能库包含一系列专为文献检索、精读、写作和出版等学术活动量身定制的 Agentic 流程，当前收录 19 个技能（另含 nature-shared 公共依赖层）。

- **项目主页**: [https://github.com/Yuan1z0825/nature-skills](https://github.com/Yuan1z0825/nature-skills)

## 🏆 核心法则 (Golden Rules)
1. **强制先导阅读**：在执行任何该技能相关的任务之前，必须优先使用 `view_file` 工具阅读该技能根目录下的 `README.md`，以获取完整的模块说明、高级参数及命令配置知识。
2. **遵守原始规范**：必须严格遵循子技能自身 README 或 SKILL 文件所定义的流程，不得擅自修改其预期工作流。
3. **隔离与独立**：各项子技能在调用时应保持独立，不要随意混用其他未指定的上下文。

## 🧭 技能版图（2026-09 版）
- **文献获取与精读**：`nature-academic-search`（多源检索 MCP）、`nature-downloader`（出版商/机构库批量取全文）、`nature-reader`（全文 Markdown 精读稿，带来源锚点与公式渲染）、`nature-literature-pipeline`（文献流水线）。
- **写作与润色**：`nature-writing`（Nature 级写作，含 Results 讨论论证结构与情态动词指引）、`nature-polishing`（润色并扫描术语、单位、数值精度与声称漂移）、`nature-proposal-writer`（基金申请书）。
- **数据与图表**：`nature-data`（数据分析）、`nature-statistics`（统计报告审查，含跨章节数值一致性）、`nature-figure`（投稿级科研绘图，含 Results 级多面板证据架构、渲染时子图对齐门与最终 PDF 文字/图形碰撞审计）。
- **发表与评审**：`nature-reviewer`（互盲审稿模拟，Major/Minor 分级）、`nature-response`（返修信与逐点回复，互盲独立回复与返修包一致性检查）、`nature-citation`、`nature-ref-verifier`（引用审计）。
- **成果转化**：`nature-paper2ppt`、`nature-image2ppt`（图片/扫描 PDF 重建为对象级可编辑 PPTX 并执行渲染 QA，本次新增）、`nature-paper-to-patent`、`nature-paper-card`、`nature-experiment-log`。

## ⚙️ 轨迹驱动执行引擎 (Execution Trajectory)
- **State 1: 初始化与文档阅读**
  - 使用 `view_file` 读取 `README.md`（或子技能目录内的说明文件）。
  - 分析并确定当前科研需求（检索、精读、写作或审计等）应当调用哪个子技能。
- **State 2: 方案构建与参数确认**
  - 根据文档指引，构建要执行的命令或操作步骤。
  - 确认是否缺少任何依赖包或环境配置，必要时提示用户配置。
- **State 3: 任务执行与成果输出**
  - 执行选定的科研任务流，输出并记录科研成果。
  - 对生成的内容进行自我审计，确保符合学术规范。

## 🛡️ 异常处理模式
- **依赖缺失**：如果发现执行过程中缺少某些 Python 依赖（例如在 `requirements.txt` 中指定但未安装的），必须首先暂停并礼貌地提示用户运行安装命令，而不是盲目报错。
- **目标不清晰**：若用户的请求属于宽泛的科研诉求且未指定具体子技能，请基于 `README.md` 的内容推荐 1-2 个最合适的子技能模块并询问用户是否采用。
