---
name: matter-workspace
description: >
  管理事务工作区——新建、列表、切换、关闭或脱离（实务级别）。
  创建、列出、切换、关闭和脱离当前事务，使一个客户或事务的上下文
  不会泄露到另一个。当多客户执业者说"新建事务"、"切换事务"、
  "列出我的事务"、"关闭此事务"或需要管理哪个事务为活跃状态时使用。
argument-hint: "<new | list | switch | close | none> [slug]"
---

# /matter-workspace

执业律师跨多个客户和事务工作。事务工作区使一个客户或事务的上下文与其他分开。此技能管理这些工作区。

## 子命令

- `/china-law:matter-workspace new <slug>` — 创建新事务工作区，运行简短信息收集，写入 `matter.md`
- `/china-law:matter-workspace list` — 列出事务及其状态和活跃标记
- `/china-law:matter-workspace switch <slug>` — 设置活跃事务
- `/china-law:matter-workspace close <slug>` — 归档事务（移至 `~/.claude/plugins/config/claude-for-legal/china-law/matters/_archived/`，永不删除）
- `/china-law:matter-workspace none` — 脱离任何活跃事务，仅在实务级别工作

## 指令

1. 读取 `~/.claude/plugins/config/claude-for-legal/china-law/CLAUDE.md` — 确认 `## 事务工作区` 部分已填写。如果 `已启用` 为 `✗`，告知用户："事务工作区已关闭——你配置为企业法务单一客户，插件自动使用实务级别上下文。如果你确实跨多个客户工作，重新运行 `/china-law:cold-start-interview --redo` 并选择私人执业设置。否则不需要 `/matter-workspace`。"
2. 按子命令逻辑执行。
3. 对 `$ARGUMENTS` 的第一个 token 分派：
   - `new` → 运行信息收集面谈，写入 `~/.claude/plugins/config/claude-for-legal/china-law/matters/<slug>/matter.md`，初始化 `history.md` 和 `notes.md`
   - `list` → 列举 `matters/*/matter.md`，打印表格，标记活跃事务
   - `switch` → 更新实务级别 CLAUDE.md 中的 `当前事务:` 行
   - `close` → 移至 `_archived/<slug>/`，在 `history.md` 中记录关闭日期
   - `none` → 将 `当前事务:` 设为 `无`

## 存储结构

```
~/.claude/plugins/config/claude-for-legal/china-law/
├── CLAUDE.md
└── matters/
    ├── <slug>/
    │   ├── matter.md
    │   ├── history.md
    │   ├── notes.md
    │   └── outputs/
    └── _archived/
        └── <slug>/
```

Slug 为小写加连字符。示例：`acme-msa-2026`、`vendor-xyz-nda`。

## `matter.md` 模板

```markdown
[工作成果标记 — 按插件配置 ## 输出]

# 事务: [客户] — [简短说明]

**Slug:** [slug]
**开始日期:** [YYYY-MM-DD]
**状态:** 活跃
**保密级别:** [标准 / 加强 / 清洁团队]

---

## 各方

**客户:** [名称]
**对方当事人:** [名称]

## 事务类型

[劳动用工 / 商业合同 / 数据合规 / 知识产权 / 公司治理 / 外商投资 / 争议解决 / 其他]

## 关键事实

[2-5句话。事务内容、利益相关方、标的、与默认实务立场的差异。]

## 事务特有偏离

*与实务级别档案的任何偏离。*

- [如: "竞业限制补偿标准：客户要求月工资50%，非司法解释标准的30%。"]

## 相关事务

- [slug — 一行说明关联原因]
```

## 注意事项

- 跨事务上下文关闭时（默认），在事务A中工作的技能绝不读取事务B的文件
- 归档不是删除——关闭的事务仍可读取以满足留存/利益冲突需要
