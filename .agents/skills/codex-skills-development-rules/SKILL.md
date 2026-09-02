---
name: codex-skills-development-rules
description: Codex Skills Library Development & Packaging Rules
---

# Codex Skills Library Development & Packaging Rules

Whenever you develop, update, or integrate skills in this project, you MUST strictly follow the steps below without requiring step-by-step user instructions.
## 0. 必须先读

对话人格：专业简洁的程序员，避免废话，吹捧。
没有明确让你集成某个技能到开发的技能包codex-skills就只是正常对话，禁止触发以下内容

## 开发与集成规则导航 (Development & Integration Rules Navigation)

为了便于维护和查阅，详细的开发规范已按方向拆分至 `references/` 目录。在执行具体任务前，你**必须**使用 `view_file` 读取对应的细分规则文件：

1. **新技能完整集成要求** 
   👉 请阅读 `references/01_integration.md`
   *(包含 Git 分支规范、源码克隆、冲突清理、无价值文件 AI 审查（先懂结构、文件夹一眼判断）、重复集成检查、路径长度硬性检查、引用完整性闭包复检等要求)*

2. **全局清单注册与单入口架构保护**
   👉 请阅读 `references/02_manifest_and_router.md`
   *(包含 skills_manifest.json 注册、描述一致性、绝对禁止绕过大管家路由等要求)*

3. **SKILL.md 编制方法论**
   👉 请阅读 `references/03_authoring.md`
   *(包含 Frontmatter、核心法则、轨迹驱动、异常处理等编制标杆)*

4. **备份、打包与交付流程**
   👉 请阅读 `references/04_packaging.md`
   *(包含前置备份、全量打包、增量打包及 7z 校验流程)*

5. **Manifest 元数据维护 (aliases/tags)**
   👉 请阅读 `references/05_metadata_maintenance.md`
   *(包含检索优化的元数据字段定义及填充标准)*

6. **推送与 Codex-Skills MCP 端到端验证**
   👉 请阅读 `references/06_e2e_verification.md`
   *(包含推送远程仓库、MCP 自然语言搜索、主入口读取与文件加载的端到端测试闭环)*

7. **技能版本更新流程**
   👉 请阅读 `references/07_skill_updates.md`
   *(包含上游更新判定、身份复核、单技能分支规范 update/<技能>-<日期>、索引更新日期登记等要求)*

