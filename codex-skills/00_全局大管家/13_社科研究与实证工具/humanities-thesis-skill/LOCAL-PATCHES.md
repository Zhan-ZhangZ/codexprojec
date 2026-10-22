# 本地集成记录

- 集成来源：<https://github.com/ganzhi-black/humanities-thesis-skill>
- 集成版本：`9f9c97162e250df8d6c214b828bb973828a2a780`（2026-10-22）
- 上游 `README.md` 已为中文说明，本仓库直接保留，未另建翻译副本。
- 为符合本技能库发布规则，仅移除上游嵌套 `.git/` 元数据与 `.gitignore`；未改动上游功能文件、`SKILL.md` 正文和脚本逻辑。

## 已知上游问题

- 2026-10-22 本地烟测：`python scripts/search.py ... --sources openalex --limit 1 --format json` 在搜索完成后触发 `NameError: name 'dedupe' is not defined`。原因是上游 `scripts/search.py` 调用了 `dedupe`、`rank`、`render_json`、`render_markdown`、`render_text`，但未从 `lib.dedupe`、`lib.score`、`lib.render` 导入这些符号。按“不修改上游缺陷”的集成边界保留原样；规避方式是直接调用各 `scripts/sources/source_*.py` 或 `search.search()` 获取原始结果，等待上游修复后再同步。`scripts/review.py` 的 21 条规则烟测正常。
