# Global Peer Comparison Implementation Plan

## Goal

When a user analyzes one listed company, automatically discover comparable listed
companies across markets, normalize their financial history, rank the best peers,
and render an auditable global comparison in the existing UZI report.

## Scope

- First-class symbol routing for China, Hong Kong, United States, Japan, Korea,
  Taiwan, Singapore, Canada, Australia, United Kingdom and major European venues.
- Provider registry with deterministic local inputs and optional network-backed
  discovery/enrichment providers.
- A canonical financial schema that preserves source currency, reporting period,
  accounting basis, provenance and missing values.
- Two-stage execution: discover a broad candidate pool, then enrich only the
  highest-ranked candidates.
- Static, self-contained HTML output with target highlighting, peer medians,
  percentiles, historical tables and a scale-versus-quality scatter plot.

## Architecture

### Instrument identity

Replace the closed A/H/U market assumption with an exchange-aware `TickerInfo`.
Keep `market` backward compatible for current scoring while adding country,
exchange, currency and provider symbols.

### Provider contract

Providers expose independent capabilities:

- `discover(target, limit)`
- `profile(instrument)`
- `financials(instrument)`
- `quote(instrument)`

Provider failures are isolated. Every returned fact carries source and freshness
metadata. API keys are read only from environment variables.

### Candidate ranking

Candidates are scored by industry, business description, scale, geography,
financial coverage and fiscal-period alignment. Duplicate listings and the target
issuer are removed before ranking.

### Financial normalization

Normalize revenue, attributable net income, margins, ROE, ROIC, cash flow and
valuation metrics without replacing missing values with zero. Monetary values keep
both original currency and optional base-currency values. Annual, quarterly and TTM
periods never share the same comparison series.

## Delivery Steps

1. Add routing tests and support global exchange suffixes.
2. Add canonical instrument/financial/peer schemas.
3. Add provider registry and Yahoo-backed global fallback discovery/enrichment.
4. Add optional official-source adapters behind environment configuration.
5. Add candidate scoring, deduplication, caching and partial-failure handling.
6. Integrate global peer output into `fetch_peers` and comparable-company analysis.
7. Add report visualization and responsive rendering tests.
8. Run focused tests, full pytest, static checks and a cached end-to-end fixture.

## Acceptance Criteria

- Global symbols such as `7203.T`, `005930.KS`, `2330.TW`, `ASML.AS`,
  `SHOP.TO`, `BHP.AX` and `D05.SI` route correctly.
- A global peer result contains no target duplicate and no duplicate issuer symbol.
- At least three valid peers are required for percentile conclusions.
- Every displayed value identifies its reporting period, currency and source.
- Missing data is displayed as unavailable, never as a fabricated zero.
- One provider timing out does not prevent the single-stock report from completing.
- Existing A/H/US behavior and the complete regression suite remain green.
