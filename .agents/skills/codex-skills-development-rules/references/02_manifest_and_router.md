# 2. 📝 全局清单注册与描述一致性 (Manifest & Description Consistency)

* **全局注册**：在 `codex-skills/skills_manifest.json` 中注册新技能，定义其 `name`, `description` (中文), `category`, `folder`, `relative_path`。
* **描述一致性**：新技能 `SKILL.md` 头部 frontmatter 中的 `description` 必须与 `skills_manifest.json` 中定义的描述**完全一致（包含语言和标点符号）**。
* **路径格式统一**：`relative_path` 字段**必须以 `./` 开头**（如 `./05_多媒体与设计资产/claude-real-video`），保证大管家路由解析一致。禁止使用裸路径（如 `05_多媒体与设计资产/xxx`）。

# 3. 🚫 单入口路由架构保护 (Single-Entry Router Guard)

* **严禁绕过路由**：`.agents/skills.json` 和 `codex-skills/skills.json` 中**永远只保留全局大管家一个入口**。绝对禁止将任何子技能直接注册到这两个文件中。
* **所有新技能的可发现性，仅通过在 `skills_manifest.json` 中注册来实现**，由大管家统一路由分发。这是重构后"单入口路由"架构的核心安全锁。
