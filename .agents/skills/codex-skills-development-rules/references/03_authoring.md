# 4. 🎯 SKILL.md 编制方法论 (SKILL.md Authoring Standard)

若项目内本身存在入口skill文件，则继续使用项目本身的，只有当项目没有skill文件我们才去编写处理。否则只需要对其头部的格式就行。

* **参照标杆**：新技能的 `SKILL.md` 必须参照 `00_全局大管家/codex_skills/SKILL.md` 的方法论进行编写但不是模仿方法论，而是理解了其使用的方法论（若新技能本身具备完善的结构则无需做更改，只有当新技能项目本身不具备skill.md文件和缺失头部 frontmatter 中的 `description` 才需要我们做新增和更改），包含以下结构要素：
  * **Frontmatter**（YAML）：`name` 和 `description`（与 manifest 一致）。
  * **核心法则 (Golden Rules)**：该技能的底线约束。
  * **轨迹驱动执行引擎 (Execution Trajectory)**：以状态机形式定义执行步骤。
  * **异常处理模式**：定义依赖缺失或输入异常时的回复规范。
* **引导阅读项目文档**：如果该技能的原始项目自带 `README.md`（包含高级参数或配置说明），`SKILL.md` 中**必须显式引导 Agent 在执行前先 `view_file` 阅读该 README**，以获取完整的命令参数知识。
