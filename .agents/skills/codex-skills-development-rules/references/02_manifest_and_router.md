# 2. 📝 全局清单注册与描述一致性 (Manifest & Description Consistency)

* **全局注册**：在 `codex-skills/skills_manifest.json` 中注册新技能，定义其 `name`, `description` (中文), `category`, `folder`, `relative_path`。
* **描述一致性**：新技能 `SKILL.md` 头部 frontmatter 中的 `description` 必须与 `skills_manifest.json` 中定义的描述**完全一致（包含语言和标点符号）**。
* **路径格式统一**：`relative_path` 字段**必须以 `./` 开头**（如 `./05_多媒体与设计资产/claude-real-video`），保证大管家路由解析一致。禁止使用裸路径（如 `05_多媒体与设计资产/xxx`）。

# 清单与文件目录校验

每次修改技能或清单后执行以下顺序，CI 执行对应的只读检查与回归测试：

1. 暂存技能文件与清单内容。运行 `python3 scripts/build_file_indexes.py --write`，由 Git 暂存区生成内容寻址的文件目录；不要手工编辑 `file_index` 或 `.catalog/`。
2. 运行 `python3 scripts/validate_manifest.py`，校验清单字段、名称与路径唯一性、目录 SHA-256、文件数量/大小总和、Git blob SHA 与 mode、文件路径包含关系、入口 SKILL.md 和符号链接目标。
3. 运行 `python3 scripts/build_file_indexes.py --check`，确认目录内容与 Git 暂存文件一致。
4. 暂存生成的清单及 `.catalog/` 文件，再提交。根管家 `./` 不生成整个技能库的文件目录；旧内容哈希目录保留供尚未刷新清单的客户端使用。

校验器只读取本地 Git 对象和目录元数据，不跟随符号链接、不下载文件、不修改技能。越界链接和循环链接会使校验失败；目标缺失的链接作为警告逐项报告，按集成规则判断其来源和必要性，不为消除告警擅改上游内容。校验器自身回归命令：`python3 -m unittest discover -s tests -p 'test_*.py' -v`。

# 3. 🚫 单入口路由架构保护 (Single-Entry Router Guard)

* **严禁绕过路由**：`.agents/skills.json` 和 `codex-skills/skills.json` 中**永远只保留全局大管家一个入口**。绝对禁止将任何子技能直接注册到这两个文件中。
* **所有新技能的可发现性，仅通过在 `skills_manifest.json` 中注册来实现**，由大管家统一路由分发。这是重构后"单入口路由"架构的核心安全锁。
