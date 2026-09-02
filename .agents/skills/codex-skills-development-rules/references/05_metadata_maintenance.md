---
name: manifest-metadata-maintenance
description: 维护 codex-skills 清单（skills_manifest.json）的 aliases/tags 元数据。当需要给存量技能批量补充检索元数据、审核新增技能的 aliases/tags、校验清单元数据质量、或让搜索能召回描述里没有的关键词时使用。
---

# Manifest 元数据维护（aliases/tags）

维护对象：`codex-skills/skills_manifest.json` 中每条技能条目的 `aliases`、`tags` 可选字段。目的：让搜索能召回技能名和描述里没有的关键词。当前 manifest 无任何 aliases/tags，全部为存量补充任务。

## 字段定义

- `aliases`：用户真实会搜的叫法（中文名、简称、英文同义词、领域俗称）。权重 2.0。
- `tags`：稳定主题词（领域、技术栈、使用场景、文件/对象类型）。权重 1.5。

```json
{
  "name": "paper-search",
  "aliases": ["文献检索", "论文搜索", "学术检索"],
  "tags": ["arXiv", "PubMed", "文献综述", "学术", "检索"]
}
```
