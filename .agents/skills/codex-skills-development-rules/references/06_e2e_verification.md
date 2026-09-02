# 6. 🧪 推送与 Codex-Skills MCP 端到端验证 (End-to-End MCP Verification)

在完成新技能的集成、清单注册与本地分支合并后，**必须**执行远程推送与 MCP 服务的端到端验证闭环，以确保下游 Agent 及各 MCP 客户端能正常发现并使用新技能。

---

## 1. 🚀 远程同步 (Git Push)

功能分支合并回 `main` 分支后，必须将最新代码推送到远程主仓库：
```bash
git push origin main
```

---

## 2. 🔍 MCP 端到端验证流程 (Verification Pipeline)

推送完成后，必须通过调用 `codex-skills` MCP 工具（或执行 Node.js 测试脚本）对新集成的技能进行真实链路测试：

### 步骤一：自然语言搜索验证 (`search_skills`)
- **测试方法**：使用新技能的中文名称、别名（aliases）或高频业务场景作为 `query` 调用 `search_skills`。
- **校验点**：
  1. 新技能必须出现在检索结果中（通常要求在 Top 1~Top 3 内）。
  2. 命中高亮词（Leading Words / aliases / tags）正确匹配。

### 步骤二：技能主文档读取验证 (`read_skill`)
- **测试方法**：传入精确的技能名称（`name`），调用 `read_skill`。
- **校验点**：
  1. 成功吐出完整的 `SKILL.md` 核心法则与执行轨迹，无 "Skill not found" 错误。
  2. 自动依赖探测正常（如 Python pip / Node.js npm / markdown-only）。
  3. 若为多模块套件，需能自动探测并列出所有嵌套子技能（sub-skills）。

### 步骤三：关键子文件按需加载 (`load_skill_file`)
- **测试方法**：调用 `load_skill_file` 读取该技能目录下的某个关键子文件（如 `README.md`、子模块 `SKILL.md` 或配置脚本）。
- **校验点**：文件内容完整加载，相对路径寻址无越界（Path Traversal Safe）。

---

## 3. 💡 双模式测试原则 (Local & Remote)

- **本地模式验证**：基于本地 `skills_manifest.json` 与目录结构，验证索引算法与文件系统路径的正确性。
- **远端拉取模式**：验证从 GitHub 远端仓库（`raw` / `API`）动态拉取 Manifest 与技能代码包时的网络容错、缓存 TTL 与完整度。

> **验收标准**：只有当 `search_skills` 成功命中召回，且 `read_skill` 能够完整读出指令与文件树时，该技能才算真正集成交付成功。
