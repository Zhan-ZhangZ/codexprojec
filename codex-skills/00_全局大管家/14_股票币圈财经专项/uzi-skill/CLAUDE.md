# UZI-Skill · Claude Code Context

> 本文件供 Claude Code 自动读取，提供项目上下文。

## 这是什么

一个股票深度分析 plugin。用户说"分析 XXX"时，你应该自动触发 `deep-analysis` skill。

## 核心技能

| Skill | 触发条件 | 说明 |
|---|---|---|
| `deep-analysis` | 用户提到"分析/研究/估值/DCF/值不值得买"等 | 22维数据 + 66评委 + Bloomberg报告 |
| `investor-panel` | 用户要求"只看评委/大佬怎么看" | 单独跑投资者面板 |
| `lhb-analyzer` | 用户提到"龙虎榜/游资/营业部" | 龙虎榜专项分析 |
| `trap-detector` | 用户提到"杀猪盘/有没有问题/安全吗" | 杀猪盘检测 |

## 工作流 · 深浅两档（v2.10.6 · v3.9.4 强化）

**快速路径（默认）**：用户说"分析/看看"、或 lite/medium 档时，走 CLI 直跑。
```
python3 run.py <ticker> --depth lite --no-browser   # 30-60s
# 或
python3 run.py <ticker> --depth medium --no-browser # 2-4min，默认完整度
```
lite/medium 档 `agent_analysis.json` 缺失自动降级 warning，照样出 HTML。**不需要 role-play 66 评委**。

**深度路径（deep 档必须走）**：当用户要 `--depth deep`、DCF / IC memo / 首次覆盖 / 投委会备忘录等深度产物时，**你必须介入 role-play，不能只跑 CLI**：
1. `stage1()` — 脚本采集数据 + 规则引擎骨架分
2. **你介入（必走）** — 读 `panel.json` + `personas/*.yaml`，以 66 评委身份逐个分析当前股票，写 `agent_analysis.json`（含 `per_investor_override`）
3. `stage2()` — 自动合并你的 role-play 成果，生成报告

> ⚠️ **deep 档不要直接 `python run.py <ticker> --depth deep` 一把梭**——那是纯规则输出。deep 的意义就在于你代入角色做判断。见 AGENTS.md 路径判断表。

详细流程见 `AGENTS.md` / `skills/deep-analysis/SKILL.md`。

## 重要文件

- `AGENTS.md` — 完整 agent 指令
- `skills/deep-analysis/SKILL.md` — 深度分析工作流
- `skills/deep-analysis/scripts/run_real_test.py` — 主引擎
- `commands/analyze-stock.md` — `/analyze-stock` 命令
