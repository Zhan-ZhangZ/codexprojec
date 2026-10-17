---
name: Scientific Agent Skills
description: "跨学科科研 Agent Skills 集合，收录 163 个子技能，覆盖生物、化学、医学、物理、地球科学、材料、数据分析和科学绘图。"
version: 2.65.0
metadata:
  upstream: github.com/K-Dense-AI/scientific-agent-skills
---
# Scientific Agent Skills

这是一套跨学科科研 Agent Skills，当前收录 **163 个**子技能，覆盖生物、化学、医学、物理、地球科学、材料、数据分析和科学绘图。

## 使用方法

当需要调用某个特定学科的专业能力（如 `scanpy`, `rdkit`, `pennylane`, `matplotlib`, `astropy`, 等等）时，你可以深入到 `skills/` 子目录中阅读对应的 `SKILL.md` 来加载能力。

## v2.65.0 要点（2026-08-31）

- 成员 158→163：新增 `deepspot-m`、`lab-hardware-cad`、`ncats-arax`、`relsa-severity-assessment`、`waypoint-bio`
- 成员技能持续重写：`scientific-schematics` v1.6（Nano Banana 2 + Gemini 3.6 Flash 质检）、`scientific-visualization` v1.1（真实性优先 + 五个审计 CLI）——两者在本库已作为独立技能单列（见 `12_学术论文与科研图表`）
- 上游 README 精简（移除 Star History）；plugin.json 成为插件分发清单

## 参考文档索引

- [README.md](README.md) — 上游总说明（安装/技能目录）
- [docs/skills.md](docs/skills.md) — 全部技能清单与说明
- [docs/examples.md](docs/examples.md) — 用例；[docs/security-report.md](docs/security-report.md) 安全审计
- [plugin.json](plugin.json)、[pyproject.toml](pyproject.toml)、[LICENSE.md](LICENSE.md) — 技能清单、运行依赖与许可证

## 上游

- https://github.com/K-Dense-AI/scientific-agent-skills
