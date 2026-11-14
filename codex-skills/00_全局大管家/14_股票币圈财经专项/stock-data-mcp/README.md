# stock-data-mcp

MCP server wrapper for `open-stock-data`.

This project is a thin shell: it imports `open_stock_data.tools.TOOL_REGISTRY` and registers every upstream tool as an MCP tool automatically. That means new upstream tools and metadata are exposed here after you install a newer `open-stock-data` release.

## Install

```bash
pip install stock-data-mcp
```

## Usage

```bash
# stdio mode (default)
stock-data-mcp

# HTTP mode
stock-data-mcp --http --host 0.0.0.0 --port 8808

# Add to Claude Code
claude mcp add stock-data \
    -e TUSHARE_TOKEN=your_token \
    -e ALPHA_VANTAGE_API_KEY=your_key \
    -e OKX_BASE_URL=https://okx.4url.cn \
    -e BINANCE_BASE_URL=https://bian.4url.cn \
    -- uvx stock-data-mcp
```

## Current Upstream Coverage

Current upstream `open-stock-data` provides 43 tools across A-share, HK, US stock, crypto, and market/news use cases.

### A-Stock

- `index_prices` - A股指数 K 线数据
- `stock_prices` - 个股 K 线数据
- `stock_realtime` - 个股实时行情
- `stock_batch_realtime` - 批量实时行情
- `search` - 股票搜索
- `stock_info` - 个股基本信息
- `stock_indicators` - 财务指标摘要
- `get_current_time` - 当前时间与交易日历
- `stock_lhb_ggtj_sina` - 龙虎榜
- `stock_sector_fund_flow_rank` - 板块资金流排名
- `stock_margin_trading` - 融资融券
- `stock_zt_pool` - 涨停池
- `stock_north_flow` - 北向资金
- `stock_block_trade` - 大宗交易
- `stock_holder_num` - 股东人数
- `stock_chip` - 筹码分布
- `stock_fund_flow` - 个股资金流向
- `stock_sector_spot` - 板块行情
- `stock_board_cons` - 板块成分股
- `stock_market_pe_percentile` - 市场 PE 分位
- `stock_industry_pe` - 行业 PE
- `stock_dividend_history` - 分红历史
- `stock_institutional_holdings` - 基金持仓
- `stock_earnings_calendar` - 业绩披露日历
- `stock_financial_compare` - 财务对比
- `stock_locked_shares` - 限售解禁
- `stock_pledge_ratio` - 质押比例
- `stock_top10_holders` - 十大股东
- `backtest_strategy` - 回测策略

### US / HK / Crypto / Market

- `stock_prices_us` - 美股/港股 K 线
- `stock_overview_us` - 美股概览
- `stock_financials_us` - 美股财报
- `stock_earnings_us` - 美股业绩
- `stock_insider_us` - 内部交易
- `stock_news_us` - 美股新闻
- `stock_tech_indicators_us` - 美股技术指标
- `okx_prices` - OKX 行情
- `okx_loan_ratios` - OKX 借贷比
- `okx_taker_volume` - OKX 主动买卖量
- `binance_ai_report` - Binance AI 报告
- `stock_news` - 个股新闻
- `stock_news_global` - 全球财经新闻
- `data_source_status` - 数据源状态

## Symbol Formats

Upstream tools normalize common stock-code inputs before routing. This is especially relevant for `stock_prices`, `stock_realtime`, `stock_info`, and `stock_indicators`.

- A股个股: `600519`, `000001`, `sh600519`, `sz000001`, `600519.SH`, `000001.SZ`
- ETF: `510300`, `159001`, `sh510300`, `sz159001`, `510300.SH`, `159001.SZ`
- 港股: `01810`, `1810`, `HK01810`, `01810.HK`, `1810.hk`
- 美股: `AAPL`, `MSFT`, `BRK.B`

Notes:

- 港股工具会将以上输入标准化为 5 位纯数字代码，例如 `01810.HK` -> `01810`
- A股和 ETF 工具会将带市场前缀或后缀的代码标准化为 6 位纯数字代码，例如 `sh600519` -> `600519`
- 美股代码会统一转为大写，例如 `brk.b` -> `BRK.B`
- 目前未专门支持 `SHSE.600519`、`SZSE.159001` 这类交易所前缀格式

## Data Sources And Failover

The exact failover path is implemented by `open-stock-data`, not by this wrapper. Current upstream behavior includes:

- A股实时: `Efinance -> Akshare -> Tushare`
- 港股实时: `Akshare -> YFinance`
- ETF 实时: `Akshare -> YFinance`
- 美股实时: `YFinance -> AlphaVantage`
- 日 K 线: `Tushare -> Efinance -> Akshare -> Pytdx -> Baostock`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TUSHARE_TOKEN` | Tushare API token |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key |
| `OKX_BASE_URL` | Custom OKX API proxy endpoint |
| `BINANCE_BASE_URL` | Custom Binance API proxy endpoint |
| `NEWSNOW_CHANNELS` | Comma-separated news source channels |
| `ENABLE_EASTMONEY_PATCH` | Set to `true` to inject randomized `User-Agent` and `nid18` token for Eastmoney requests when Eastmoney endpoints are being rate-limited |
| `LOG_LEVEL` | Logging level, default `INFO` |

## Eastmoney Patch

If Eastmoney endpoints fail frequently with `RemoteDisconnected`, abrupt resets, or similar rate-limit style errors, enable:

```bash
export ENABLE_EASTMONEY_PATCH=true
```

When enabled, upstream will:

- inject a randomized `User-Agent`
- fetch and cache an Eastmoney `nid18` token
- merge the `nid18` cookie into existing cookies
- add a small randomized delay before Eastmoney requests
