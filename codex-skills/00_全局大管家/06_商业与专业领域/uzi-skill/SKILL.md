---
name: uzi-skill
description: Uzi 中文区量化投研与大中华市场 (A股/港股) 靶向狙击库。内置 180 条红线级量化审计规则与 22 个基本面剖析维度。覆盖游资龙虎榜异动追踪、机构深度估值排雷，并加载特有的「多风格投资大佬评审团」交叉验证。Leading Words: 大中华A股港股量化投研, 龙虎榜异动追踪审计, 180条量化红线排雷, 投资大佬交叉评审闭环
---

# UZI-Skill

- **项目主页**: https://github.com/wbh604/UZI-Skill
- **上游版本**: v3.9.4（含 2026-08-27 营收同比口径与残缺财务数据两项加固）

## 功能说明

中文投资者最实用的 A股/港股/美股 分析技能包。22 维数据 × 66 位投资大佬评审团（9 大流派）× 22 种机构级分析方法，量化规则库已扩至 242 条。四个子技能各司其职：

- `skills/deep-analysis` — 个股深度研究、估值、IC 备忘录与 Bloomberg 风格 HTML 报告
- `skills/investor-panel` — 投资大佬评审团投票与 persona 复审
- `skills/lhb-analyzer` — 游资龙虎榜、席位识别与 A 股短线分析
- `skills/trap-detector` — 杀猪盘/荐股群八信号排雷

## 本版要点（v3.9.0 → v3.9.4 + 8-27 加固）

- **营收同比口径加固（revenue-yoy）**：营收增速优先采用财报披露的官方同比增长（按多列名称回退匹配），仅在其整体缺失时才用历史营收推导，并随值标注口径（reported_yoy / annual_yoy）与来源列名；A股/港股统一该口径，非有限数值一律按缺失处理。
- **残缺财务数据护栏（partial-financial-data）**：DCF 敏感性热力图与可比公司、LBO、首次覆盖、投委会备忘录等机构模块遇到缺失值时显示 "—"，不再把缺项当 0 渲染或让 `None` 泄漏到报告；时间序列中的缺失点不再被折算为零后参与迷你图。
- 管线与研究数据完整性加固、亏损股分析管线恢复；v3.9.4 前端显示修复（None 泄漏清零、移动端图表自适应）与整体美化。
- v3.9.0 起评审团扩至 66 位，新增由十年实盘交割单蒸馏的「股海贼王」评委（画像见 [docs/ghzw-dossier.md](./docs/ghzw-dossier.md)）；v3.9.2 起新增全球同行对比（global-peers）。

## 使用方式

```bash
python3 run.py <ticker> --no-browser   # 默认完整分析并出 HTML 报告
python3 run.py <ticker> --depth lite   # 快速扫描（30-60s）
python3 run.py <ticker> --school F     # 单一流派（如 A 股游资）
python3 run.py <ticker> --remote       # 远程/移动端报告
```

深度档（deep）产出 DCF、IC memo 等深度结论时，须按 `AGENTS.md` 走 stage1 采集 → 评委 role-play → stage2 合并的两段式流程，不得只跑 CLI。

## 详细指南

配置、触发提示词与完整命令清单见 [README.md](./README.md)；版本演进与修复历史见 [RELEASE-NOTES.md](./RELEASE-NOTES.md)；数据源与口径说明见 [docs/DATA-PROVIDERS.md](./docs/DATA-PROVIDERS.md)。
