---
name: spicebridge
description: "基于 ngspice 的电路设计与仿真分析 MCP。支持使用自然语言描述电路结构，自动生成标准 SPICE 网表并运行 AC、DC
  或瞬态仿真，可分析提取波形数据甚至导出为 KiCad 格式。Leading Words: ngspice电路设计仿真, SPICE网表自动生成,
  AC/DC瞬态仿真, 波形数据分析提取"
metadata:
  upstream: github.com/clanker-lover/spicebridge
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# spicebridge

基于 ngspice 的电路设计与仿真分析 MCP。支持使用自然语言描述电路结构，自动生成标准 SPICE 网表并运行 AC、DC 或瞬态仿真，可分析提取波形数据甚至导出为 KiCad 格式。

## 何时使用

适用任务：基于 ngspice 的电路设计与仿真分析 MCP。支持使用自然语言描述电路结构，自动生成标准 SPICE 网表并运行 AC、DC 或瞬态仿真，可分析提取波形数据甚至导出为 KiCad 格式。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/spicebridge/SKILL.md` — **spicebridge**：Circuit design and SPICE simulation assistant. Use when the user asks about circuit design, filters (low-pass, high-pass, bandpass, notch), amplifiers (inverting, differential, instrumentation, summing), voltage divider…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/clanker-lover/spicebridge
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
