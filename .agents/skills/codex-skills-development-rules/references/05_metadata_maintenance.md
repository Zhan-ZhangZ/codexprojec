---
name: manifest-metadata-maintenance
description: 维护 codex-skills 清单（skills_manifest.json）的 aliases/tags 元数据。当需要给存量技能批量补充检索元数据、审核新增技能的 aliases/tags、校验清单元数据质量、或让搜索能召回描述里没有的关键词时使用。
---

# Manifest 元数据维护（aliases/tags）

维护对象：`codex-skills/skills_manifest.json` 中每条技能条目的 `aliases`、`tags` 可选字段。目的：让搜索能召回技能名和描述里没有的关键词。现有条目已经包含部分检索元数据；按实际技能能力逐项维护，避免批量添加无关关键词。

## 字段定义

- `aliases`：用户真实会搜的叫法（中文名、简称、英文同义词、领域俗称）。权重 2.0。
- `tags`：稳定主题词（领域、技术栈、使用场景、文件/对象类型）。权重 1.5。

`aliases`、`tags`、`dependencies` 存在时必须是非空白字符串组成的数组，禁止完全重复项；大小写不同的名称可以保留。`language` 为非空白字符串，`updated_at` 为 ISO 日期或时间，`stars` 为非负整数。`file_index` 仅由文件目录生成器写入。

修改后执行 `python3 scripts/validate_manifest.py`。若清单内容尚未暂存，先暂存再运行 `python3 scripts/build_file_indexes.py --write`，最后以 `--check` 确认目录与暂存文件一致。字段校验失败时修正具体条目；不要删除已有检索元数据来绕过检查。

```json
{
  "name": "paper-search",
  "aliases": ["文献检索", "论文搜索", "学术检索"],
  "tags": ["arXiv", "PubMed", "文献综述", "学术", "检索"]
}
```
