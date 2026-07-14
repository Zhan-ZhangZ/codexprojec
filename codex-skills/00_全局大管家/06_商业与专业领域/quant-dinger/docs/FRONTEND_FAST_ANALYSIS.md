# 快速分析（Fast Analysis）前端对接说明

本开源仓库中的 **`frontend/` 仅包含构建产物 `dist/`**，Vue 源码在**私有前端仓库**（见根目录 `.github/workflows/update-frontend.yml`）。因此在本仓库内**无法直接修改** `FastAnalysisReport.vue` 等组件，需要在私有仓库中按下列说明调整。

## 1. 止盈 / 止损显示反了（BUY/SELL）

### 后端约定（`/api/fast-analysis/analyze`）

- **`trading_plan.stop_loss` / `trading_plan.take_profit`** 已与 `decision` 对齐几何关系：
  - **BUY**：`stop_loss < 现价 < take_profit`
  - **SELL（空）**：`take_profit < 现价 < stop_loss`（止损在上方，止盈在下方）
- **`indicators.trading_levels.suggested_stop_loss / suggested_take_profit`** 在采集器里是**多单（做多）参考价**，**不能**在 SELL 时直接拿来当界面上的「止损/止盈」两行，否则会和空单几何相反。

### 前端常见错误

- 第一行写死绑定 `trading_levels.suggested_stop_loss`、第二行绑定 `suggested_take_profit`。
- 或把 `stop_loss` / `take_profit` **标签写反**（模板里「止损」绑了 `take_profit`）。

### 推荐写法（私有仓库中修改）

只使用接口返回的 **`data.trading_plan`**（或兼容字段 **`stopLoss` / `takeProfit`**）：

```text
止损（亏损离场价）: trading_plan.stop_loss  （或 stopLoss）
止盈（盈利目标价）: trading_plan.take_profit （或 takeProfit）
```

可选：根据 `trading_plan.decision === 'SELL'` 在文案旁加一句「空单：止损在现价上方，止盈在现价下方」。

### API 兼容字段（后端已加）

`trading_plan` 内额外包含：

- `entryPrice`, `stopLoss`, `takeProfit`, `positionSizePct`
- `loss_exit_price`, `profit_target_price`（与止损/止盈数值一致，语义更清晰）
- `decision`：与主结果 `decision` 一致，便于组件内判断

根级另有驼峰：`trendOutlook`, `trendOutlookSummary`（与 `trend_outlook` 等相同内容）。

## 2. 「未来时间段预判」不显示

后端字段：

- **`trend_outlook`**：对象，含 `next_24h`, `next_3d`, `next_1w`, `next_1m`（每项含 `score`, `trend`, `strength`）。
- **`trend_outlook_summary`**：一行可读摘要（中文/英文随 `language`）。
- 若走 **`/api/fast-analysis/analyze-legacy`**：`fast_analysis` 内同样有上述字段；`overview.report` 会追加 **【周期预判】** 段落；顶层也有 `trend_outlook` / `trend_outlook_summary`。

### 前端需要做的

- 在快速分析结果页**单独渲染** `trend_outlook` 或 `trend_outlook_summary`（不要只读 `summary` 正文）。
- 若请求的是 legacy 接口，请读 **`data.fast_analysis.trend_outlook`** 或顶层 **`data.trend_outlook`**，不要假设只在某一嵌套路径下。

## 3. 自检清单

| 检查项 | 说明 |
|--------|------|
| 接口路径 | 确认用的是 `/analyze` 还是 `/analyze-legacy`，字段路径一致 |
| 绑定来源 | 止损/止盈是否来自 `trading_plan`，而非 `trading_levels` |
| SELL 几何 | 空单位：`take_profit < current < stop_loss` |
| 周期预判 | 模板是否包含 `trend_outlook` 或 `trend_outlook_summary` |

在私有前端仓库（QuantDinger-Vue）上修改后，打 `v*` tag 即触发 `release-frontend.yml` 自动发布到 GHCR；本仓 `docker compose pull frontend && up -d frontend` 即生效。
