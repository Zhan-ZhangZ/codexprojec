# AI 完整交易系统改造方案

##目标
把当前偏「指标 IDE + 回测 + 快捷交易」的系统，升级成：

`Market Regime Engine -> Strategy Generator -> Backtest Engine -> Strategy Scoring -> Strategy Evolution -> Best Strategy Output`

第一版目标不是全自动实盘，而是：

- AI 识别当前市场状态
- 批量生成/接收多个策略候选
- 自动回测并统一评分
- 自动做基础参数进化
- 输出一个最优候选策略，供用户继续人工确认或晋升到实盘

##本次已直接落地的改造

###新增后端能力
- `app/services/experiment/regime.py`
  - 规则型市场状态识别
  - 输出状态、置信度、特征和推荐策略族
- `app/services/experiment/scoring.py`
  - 多因子评分
  - 综合收益、年化、夏普、回撤、稳定性、胜率、盈亏比
- `app/services/experiment/evolution.py`
  - 基于结构化参数空间生成候选变体
  - 支持 grid / random
- `app/services/experiment/runner.py`
  - 串联状态识别、批量回测、评分、排名、最佳策略输出
- `app/routes/experiment.py`
  - 新增实验编排 API

###新增接口

####1. 市场状态识别
`POST /api/experiment/regime/detect`

请求示例：

```json
{
  "market": "Crypto",
  "symbol": "BTC/USDT",
  "timeframe": "1D",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

####2. 完整实验管线
`POST /api/experiment/pipeline/run`

请求示例：

```json
{
  "base": {
    "indicatorCode": "output = {'signal': df['close'] > df['close'].rolling(20).mean()}",
    "market": "Crypto",
    "symbol": "BTC/USDT",
    "timeframe": "1D",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "initialCapital": 10000,
    "commission": 0.02,
    "slippage": 0.02,
    "leverage": 1,
    "tradeDirection": "long",
    "strategyConfig": {
      "risk": {
        "stopLossPct": 2,
        "takeProfitPct": 6
      }
    }
  },
  "variants": [
    {
      "name": "tight_risk",
      "overrides": {
        "strategyConfig.risk.stopLossPct": 1.5,
        "strategyConfig.risk.takeProfitPct": 4
      }
    }
  ],
  "evolution": {
    "method": "grid",
    "maxVariants": 8
  },
  "parameterSpace": {
    "strategyConfig.risk.stopLossPct": [1.0, 1.5, 2.0],
    "strategyConfig.risk.takeProfitPct": [4, 6, 8]
  }
}
```

返回内容包含：
- `regime`
- `generatorHints`
- `rankedStrategies`
- `bestStrategyOutput`

##如何与现有系统结合

###1. Indicator IDE
建议新增一个按钮：
- `运行 AI 实验`

它不再只跑单次回测，而是：
- 先调用 `/api/experiment/regime/detect`
- 再把当前代码和参数提交到 `/api/experiment/pipeline/run`
- 在页面里展示：
  - 当前市场状态
  - 候选策略排行
  - 最佳候选输出

###2. 策略生成页
当前已有策略 AI 生成能力，下一步建议让它输出 `StrategySpec JSON`，再编译到策略脚本。

推荐新增中间对象：
- `StrategySpec`
- `ExperimentCandidate`
- `PromotedStrategyCandidate`

###3. Backtest Center
不再只显示单条回测结果，建议扩成：
- 单策略结果
- 多候选排行
- walk-forward 留到第二版

##下一阶段建议

###Phase 2
- AI 生成结构化 `StrategySpec`
- 不再让 LLM 直接自由写脚本

###Phase 3
- 加入 walk-forward
- 引入 OOS 评分
- 增加过拟合惩罚

###Phase 4
- 加 paper trading / shadow trading
- 建立冠军策略晋升流

##为什么先这样做
因为当前系统已经有：
- 回测引擎
- 策略脚本
- AI 生成
- 实盘执行

真正缺的是一层“实验编排中台”。

本次改造就是先把这层补出来，让产品从：

`AI 帮你写指标`

升级成：

`AI 帮你研究、比较、筛选并输出最佳策略候选`
