---
name: Vibe-Lawyering
description: ⚖️ 法律人的 AI 工具箱。聚合中国法律领域优质 Agent Skills、法律数据库 MCP 工具与 AI 教育资源的开源社区项目。
metadata:
  upstream: github.com/LawMotion-AI/Vibe-Lawyering
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# Vibe-Lawyering

⚖️ 法律人的 AI 工具箱。聚合中国法律领域优质 Agent Skills、法律数据库 MCP 工具与 AI 教育资源的开源社区项目。

## 何时使用

适用任务：⚖️ 法律人的 AI 工具箱。聚合中国法律领域优质 Agent Skills、法律数据库 MCP 工具与 AI 教育资源的开源社区项目。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `agent-skills/legal-assistant-skills/ad-compliance-review/SKILL.md` — **ad-compliance-review**：广告合规审核技能，用于审核广告素材是否符合中国广告法及相关法规。适用场景：(1) 用户提交广告文案、广告素材要求合规审核时；(2) 用户提到"广告审核""广告合规""广告法审查"等关键词时；(3) 用户要求检查广告内容是否存在违法违规风险时；(4) 用户提交房地产、食品、医疗、药品、互联网等行业广告要求专项审核时。审核依据涵盖《广告法》《反不正当竞争法》及行业专项法规。
- `agent-skills/legal-assistant-skills/contract-gen/SKILL.md` — **contract-gen**：合同生成技能，以资深法律专家身份生成完整合同。适用场景：(1) 用户要求'起草合同''生成合同''拟定协议''写合同''草拟合同'时；(2) 用户提供合同类型和交易信息，要求生成完整合同文本时；(3) 用户要求根据特定立场（甲方/乙方/买方/卖方/出租方/承租方）起草倾斜性合同时；(4) 用户要求将已有合同要点或业务条件生成为正式合同文本时。输出 Markdown 格式，可选导出 .docx。
- `agent-skills/legal-assistant-skills/contract-review/SKILL.md` — **contract-review**：合同审核技能，通过添加批注方式审查合同（不修改原文）。采用四层审核模型（主体核验、基础审核、商务条款、法律条款），生成结构化批注（问题类型、风险原因、修订建议），风险等级通过审核人名称编码，并生成合同概要、综合审核意见和Mermaid业务流程图（含渲染图片）。输出语言遵循合同语言。支持双模式企业核验：QCC CLI 用于主体信息核验（终端直连），QCC MCP 用于风险穿透预警（深度分析）。
- `agent-skills/legal-assistant-skills/law-to-markdown/SKILL.md` — **law-to-markdown**：将法条/规范文件（.txt/.docx/.pdf）转为 Markdown。适用于用户要求“法条转 markdown”“pdf/docx 转 markdown”。处理 .pdf/.docx 时先检查是否已安装 mineru-ocr skill；未安装先引导安装，安装后优先用 mineru-ocr；仅在用户明确同意时再用本地回退方案。
- `agent-skills/legal-assistant-skills/legal-job-search/SKILL.md` — **legal-job-search**：法律AI求职助手 - 帮助法律人（法务/律师）使用AI辅助求职。支持公司/律所调研、法律风险分析、网页简历生成、针对性材料准备、面试备忘录生成。具备MCP工具级降级能力，无MCP时自动使用Web Search。
- `agent-skills/legal-assistant-skills/legal-risk-visualization/SKILL.md` — **legal-risk-visualization**：法律风险结构化分析与可视化。基于法律分析文本，执行五步风险抽取模型， 生成四层可视化输出（雷达图数据、风险矩阵、影响路径图、决策树）。 适用于：(1) 用户提供法律分析报告要求风险可视化， (2) 要求风险结构分析或风险传导分析， (3) 要求生成风险决策建议或风险评估报告， (4) 提到"风险雷达图""风险矩阵""影响路径图""决策树"等关键词。
- `agent-skills/legal-assistant-skills/supply-chain-qcc/skills/supplier-risk/SKILL.md` — **supplier-risk**：Monitors ongoing risk signals and produces risk briefs for known vendors with QCC MCP integration. Activate for: supplier risk monitoring, vendor risk alert, supply risk, risk brief, supplier financial risk, credit rati…
- `agent-skills/legal-assistant-skills/supply-chain-qcc/skills/vendor-assessment/SKILL.md` — **vendor-assessment**：Classifies, scores, and evaluates vendors with QCC MCP integration for Chinese suppliers. Activate for: vendor assessment, classify vendor, vendor classification, Kraljic matrix, vendor tier, bottleneck vendor, strategi…
- `agent-skills/legal-due-diligence/SKILL.md` — **legal-due-diligence**：中国法律尽职调查底稿与报告撰写工具。支持公司主体尽职调查的完整工作流： 项目初始化→底稿逐章撰写→完整性检查→报告生成。 涵盖10大调查板块（主体资格…
- `agent-skills/红圈所律师合同审查技能/SKILL.md` — **Red-Circle-Contract-review**：当用户需要对合同进行中文审核、条款修订、批注说明、模板比对、风险识别，且最终要直接输出写有逐条批注和修订痕迹的 docx 文件时，使用这个 skill。典型触发包…
- `agent-skills/红圈所律师法律研究技能/SKILL.md` — **Red-Circle-Legal-Research**：开展法律检索、时效审查、法律备忘录写作、模板输出与结论快报。适用于按国别或法律领域分析问题、生成正式研究结果时。

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`

## 上游

- https://github.com/LawMotion-AI/Vibe-Lawyering
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
