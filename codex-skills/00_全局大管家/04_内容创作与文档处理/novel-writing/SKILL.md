---
name: novel-writing
description: 虚构文学与长篇小说创作统筹沙盘。囊括世界观架构、主线章节大纲起草、场景分镜续写与文学级别的文字表现力修改评审。Leading Words: 长篇虚构文学架构, 场景分镜续写, 世界观大纲起草, 文学表现力评审
version: v0.4.0-public
metadata:
  upstream: github.com/wgwtest/novel-writing
---

# novel-writing

- **项目主页**: https://github.com/wgwtest/novel-writing

## 功能说明
虚构文学创作三阶段工具箱：规划（场景/章节/卷/全书大纲与故事梗概）、起草与续写（保护作者文风的散文生成）、成稿评审（输出带定位、问题类型、失败原因与修改建议的具体清单）。v0.4.0 上游新增认知分层与语言、场景因果与视角权责、行为化对话三套方法论硬规则，并内置稿件确定性污染检查脚本。

## 技能包结构
上游安装包位于 `novel-writing/` 子目录：

- `novel-writing/SKILL.md` —— 技能真入口：阶段选择（Planning / Drafting / Reviewing）、长篇上下文 LOD 分层加载策略、硬规则清单（读者知识≠作者知识、重要角色不可裸进场、场景信息守访问权限、认知须改变选择与语言、视角不独占决策、对话须经行为发生、评审输出必须具体等）
- `novel-writing/references/` —— 10 篇方法论文档：planning、story-outline-and-causal-summary、cognition-layers-and-language、scene-causality-and-agency、dialogue-and-behavior、character-introductions、scene-and-structure、style-fidelity、realism-constraints、revision-checklist
- `novel-writing/scripts/check_manuscript_text.py` —— 纯标准库纯文本稿件检查器（章节标题、拉丁串残留、提示词污染等确定性风险扫描），仅依赖 Python 3 标准库
- `novel-writing/agents/openai.yaml` —— 上游 agent 清单（short_description / default_prompt）

## 使用方式
1. 读 `novel-writing/SKILL.md` 判定任务阶段，按阶段清单加载对应 references，不做全文倾倒
2. 评审类任务先读 `novel-writing/references/revision-checklist.md`，再按发现的问题加载专项文档
3. 交付纯文本稿件前运行 `novel-writing/scripts/check_manuscript_text.py` 扫描，人工复核告警，不把告警当自动缺陷

## 详细指南
安装方式、示例提示词与仓库布局见 [README.md](./README.md)。
