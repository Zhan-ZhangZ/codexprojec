---
name: legal-research
description: >
  通过预建法条全文索引（77,809条）和北大法宝 MCP 进行中国法律检索——
  五步法：本地全文本搜索 → 时效性Tier分级过滤 → 依赖链检查 → 
  NPC官方URL验证 → 北大法宝MCP交叉验证。确保全面性和时效性。
user-invocable: true
argument-hint: "[检索问题描述] [--source statute|case|journal|all]"
---

# /legal-research

中国法律系统检索 — 本地法条全文索引（77,809条） + 北大法宝 MCP 语义搜索。

## 指令

### 1. 事务上下文

- 检索目的？（法律分析/合规审查/诉讼准备/学术研究）
- 涉及的法律领域？
- 需要的法律渊源层级？（法律/行政法规/地方性法规/部门规章/司法解释）
- 是否需要案例支持？

### 2. 检索策略 — 五步法

```
Step 1 — 本地全文本检索（全面性，不可跳过）
    ↓        python3 scripts/search.py "关键词"
    ↓        跨全部 77,809 条法条全文搜索，确保不遗漏
    ↓
Step 2 — 时效性分级过滤
    ↓        T1 (88部核心) → 每次验证 NPC URL + MCP
    ↓        T2 (212部近期) → 信任索引，30天内验证一次
    ↓        T3 (807部稳定) → 信任索引，按需验证
    ↓        T4 (670部不确定) → 必须验证后才能引用
    ↓
Step 3 — 依赖链检查
    ↓        python3 scripts/search.py --deps "法律名称"
    ↓        发现该法引用了谁、被谁引用 → 修订时标记下游法律
    ↓
Step 4 — NPC 官方 URL 验证（时效性主通道）
    ↓        每部法律 frontmatter 含 urls → flk.npc.gov.cn
    ↓        直接检查官方页面，不使用百度/Google搜索代替
    ↓
Step 5 — 北大法宝 MCP 交叉验证
             mcp__pkulaw-law-search__search_article + get_article
             补充语义搜索和相关案例
```

### 2.1 本地全文本检索（Step 1 — 核心步骤）

**法条全文搜索：**

```bash
# 基本搜索：跨 77,809 条法条全文检索
python3 scripts/search.py "关键词"

# 限定 Tier：只搜已验证为现行有效的法律
python3 scripts/search.py "关键词" --tier T1,T2

# 限定法律层级
python3 scripts/search.py "关键词" --group 法律
python3 scripts/search.py "关键词" --group 行政法规

# 显示完整法条文本
python3 scripts/search.py "关键词" --verbose --top 20
```

**查看特定法律的全部法条：**
```bash
python3 scripts/search.py --law "劳动合同法"
```

**多角度查询（关键 — 确保全面性）：**
```bash
# 同一法律问题从不同角度搜 3-5 次
python3 scripts/search.py "竞业限制"
python3 scripts/search.py "竞业限制 经济补偿"
python3 scripts/search.py "竞业限制 违约金"
python3 scripts/search.py "竞业限制 期限"
python3 scripts/search.py "保密 竞业"
```

### 2.2 时效性验证（Step 2-4）

**查看某部法律的时效状态：**
```bash
python3 scripts/search.py --check "法律名称"
```
输出包含：Tier分级、当前版本、生效日期、NPC官方URL、所有历史版本、下游依赖法律。

**时效性分级总览：**
```bash
python3 scripts/search.py --tier-summary
```

**时效性判断规则：**

| 条件 | 行动 |
|------|------|
| 法律为 T1 | 每次引用前检查 NPC URL + MCP，记录验证日期 |
| 法律为 T2 | 上次验证超过 30 天 → 重新检查；否则信任索引 |
| 法律为 T3 | 索引标记为有效 → 直接引用，标注 `[T3·索引]` |
| 法律为 T4 | 必须先通过 NPC URL 或 MCP 确认后，标注 `[T4·已验证]` 或 `[T4·待核实]` |
| NPC URL 可访问且显示未修订 | 记录验证日期，标注 `[T1·NPC已验证]` |
| NPC URL 无法访问 | 使用 MCP get_article 拉取最新版，标注 `[PKULaw]` |
| MCP 与本地不一致 | 以 MCP 为准，标注差异：`[MCP版本较新 — 本地已过时]` |

### 2.3 依赖链检查（Step 3）

**检查法律之间的引用关系：**
```bash
python3 scripts/search.py --deps "法律名称"
```

**使用场景：**
- 当发现某部法律被修订时 → 运行 `--deps` 找出所有引用它的下游法律 → 逐一复核
- 做法律分析时 → 找出上位法和下位法的完整链条

### 2.4 北大法宝 MCP 检索（Step 5）

**语义检索（search_article）：**
```
mcp__pkulaw-law-search__search_article
text: "[法律问题关键词]"
```

**法条精确定位（get_article）：**
```
mcp__pkulaw-law-search__get_article
title: "[法律全称]"
number: "[条款号]"
```

### 2.5 法律渊源层级（《立法法》第87-92条）

1. 宪法 — 最高效力
2. 法律 — 全国人大及其常委会制定
3. 行政法规 — 国务院制定
4. 地方性法规 — 省级/设区的市人大及其常委会
5. 部门规章 — 国务院各部委
6. 司法解释 — 最高人民法院/最高人民检察院

### 2.6 新旧检索方式对比

| 旧方式 | 新方式 |
|--------|--------|
| 在 law-index.json 中按标题搜索 | provision-index.json 全文本搜索 77,809条 |
| 读了全文才能发现相关法条 | 直接搜到具体条文 + 所属法律 |
| 人工记得要去 MCP 交叉验证 | Tier 分级强制执行验证策略 |
| 不知道法律之间谁引用谁 | dependency-graph.json 自动追踪依赖链 |
| 时效性靠"感觉" | NPC URL + currency-manifest.json 双重确认 |
| 百度搜索验证时效 → 不可靠 | NPC 官方 URL 直接验证 |

### 2.7 关键词构造原则

- 使用法条核心概念词，如"竞业限制"而非"劳动合同法第23条"
- 同一概念从不同角度搜 3-5 次，确保覆盖
- 搜索结果自动包含司法解释、行政法规（索引覆盖全部 2,190 部）

### 3. 检索质量验证

#### 3.1 全面性检查清单

| 检查项 | 操作 |
|-------|------|
| 是否从 3+ 个角度搜索 | 同义词、上位概念、下位概念各搜一次 |
| 是否覆盖所有法律层级 | 法律 → 行政法规 → 司法解释，逐层确认 |
| 是否检查了依赖链 | 运行 `--deps` 看相关法律的上下游 |
| 是否用 MCP 补充了语义搜索 | search_article 可能找到本地关键词遗漏的结果 |

#### 3.2 时效性检查清单

| 检查项 | 操作 |
|-------|------|
| 每部引用法律的 Tier 等级 | 运行 `--check` 确认 |
| T1/T4 法律是否已验证 | NPC URL 或 MCP get_article |
| T2 法律上次验证是否超过30天 | 超过则重新验证 |
| 是否有新修订影响依赖链 | 运行 `--deps` + `--check` 核对 |

### 4. 检索结果呈现

#### 4.1 检索报告格式

每条法条格式：
```
[Tier·来源] [法律层级] 法律名称 第X条
  生效日期: YYYY-MM-DD | NPC URL: https://flk.npc.gov.cn/...
  法条原文: ...
```

**来源标注：**
- `[T1·NPC已验证]` — T1核心法律，已通过NPC官方URL确认现行有效
- `[T2·索引]` — T2近期法律，索引标记有效
- `[T3·索引]` — T3稳定法律，索引标记有效
- `[T4·已验证/待核实]` — T4法律，已验证或待验证
- `[PKULaw]` — 来自北大法宝 MCP
- `[本地+PKULaw·一致]` — 交叉验证一致
- `[MCP版本较新 — 本地已过时]` — 版本冲突，以MCP为准
- `[检索未果 — 建议扩大范围]` — 当前方法未找到
- `[该问题无明确规定 — 以法理和类似规定为参考]` — 法律空白

#### 4.2 决策树

> **下一步？**
> 1. **深入某条法条** — 读取完整法律全文（`--law`）和司法解释
> 2. **补充案例** — 用北大法宝 MCP 搜索相关案例
> 3. **检查修订风险** — 运行 `--check` 和 `--deps` 确认无遗漏的连锁修订
> 4. **扩大检索** — 用新的搜索词重新检索

### 5. 输出

检索报告 + 法条层级图 + 时效性标注 + 依赖链 + 研究空白标注 + 决策树。

**参考法律渊源:**
- 《中华人民共和国立法法》(2023修正)第87-92条、第105条
- 本地法律库 — provision-index.json (77,809条) / currency-manifest.json / dependency-graph.json
- 北大法宝法律法规数据库 (pkulaw-law-search MCP)
- 全国人大官网 (flk.npc.gov.cn)
