---
name: tradingagents
description: 机构级 AI 金融投研多智能体协同攻防沙盘 (TradingAgents)。以高度模块化架构解构专业基金工作流：基本面定性、技术面量化、情绪面降噪及风控阻断多 Agent 角色博弈，搭建全真环境下的数字投研编队。Leading Words: 多智能体投研协同沙盘, 机构级量化风控博弈, AI金融交易员矩阵, 基本面与情绪面降噪
version: 0.4.0
upstream: github.com/TauricResearch/TradingAgents
---

# TradingAgents

- **项目主页**: https://github.com/TauricResearch/TradingAgents
- **本版基准**: 上游 tag [v0.4.0](https://github.com/TauricResearch/TradingAgents/releases/tag/v0.4.0)（PyPI 包 `tradingagents` 0.4.0，Apache-2.0）

## 功能说明
顶级的 AI 金融投研多智能体协作框架。将投资决策流程拆解为基本面分析、情绪分析、新闻监测、技术指标分析、研究员、交易员以及风控管理等多 Agent 角色，可深度演练和定制完整的 AI 投研团队。

v0.4.0 要点：修复 FRED 宏观、社交情绪与记忆层的前视偏差（point-in-time 对齐）；裁决信号更清晰（无法解析的评级浮出 `REVIEW` 哨兵而非静默 Hold）；CLI checkpoint 恢复可用；Trader 决策锚定真实价格结构；新增 GPT-5.6 / GLM-5.3 模型目录。

## 安装与使用

PyPI 分发的 Python 框架，本地目录只保留文档层，源码经 pip 安装或浏览上游仓库：

```bash
pip install tradingagents
```

或从源码安装最新开发版：

```bash
git clone https://github.com/TauricResearch/TradingAgents.git
cd TradingAgents && pip install .
```

最小调用：

```python
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG

ta = TradingAgentsGraph(debug=True, config=DEFAULT_CONFIG.copy())
_, decision = ta.propagate("NVDA", "2026-01-15")
print(decision)
```

API Key 按所选 LLM 供应商配置（OpenAI / Anthropic / Google / DeepSeek / Qwen / GLM / MiniMax / OpenRouter / Ollama 等），键位模板见本地 [.env.example](./.env.example)（企业级 Azure/Bedrock 用 [.env.enterprise.example](./.env.enterprise.example)）。

## 本地文档导航

- [README.md](./README.md) — 官方完整说明：安装、CLI、多供应商配置、Python 用法、持久化恢复
- [CHANGELOG.md](./CHANGELOG.md) — 版本历史（0.2.5 → 0.4.0 全部变更明细）
- [assets/](./assets) — 架构图与四类 Agent 协同示意图
- [LICENSE](./LICENSE) — Apache-2.0 许可

框架架构总览见 [assets/schema.png](./assets/schema.png)；分析师团队、研究员辩论、交易员、风控团队的分工图见 [assets/analyst.png](./assets/analyst.png)、[assets/researcher.png](./assets/researcher.png)、[assets/trader.png](./assets/trader.png)、[assets/risk.png](./assets/risk.png)。
