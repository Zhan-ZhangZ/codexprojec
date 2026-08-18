# dsh-plugin-cas-kb

English | [中文](README.zh.md)

A DeepSeek Harness bundle for Chinese accounting, auditing and tax questions. It gives an
agent article-level access to Chinese Accounting Standards (CAS), the Accounting Standards
for Small Enterprises (ASSE), the Chinese Standards on Auditing (CSA) and Chinese tax law
— plus a skill that keeps the model from citing articles it never read.

Backed by the [Quaesto open accounting knowledge base](https://open.accountingllm.site):
**265 addressable documents** across two layers —

- **Article layer**, 53 documents / 1,832 articles: 43 CAS standards (59 source texts once
  superseded versions are counted), ASSE with the enterprise size-classification rules, and
  8 tax laws and implementing regulations. 50 of them also carry step-by-step decision
  procedures (1,681 steps) anchored to those articles.
- **Unit layer**, 212 documents / 10,013 citable units: 103 documents of auditing
  standards, their application guidance and the code of ethics (7,672 units), plus standard
  interpretations, application cases, official readings, CSRC guidance and annual-report
  circulars.

No account, no API key, read-only.

> **The auditing layer is where this bundle earns its keep.** The application guidance for
> Chinese auditing standards lives in PDF attachments scattered across the CICPA website,
> with no full-text index — general web search cannot reach the body text. Measured on CPA
> auditing questions, this bundle scores **4.9 points higher** than the same model's
> built-in web search (79 questions × 6 runs, 95% CI [+1.0, +9.2], Holm-corrected
> p = 0.013). On accounting questions there is **no gain** — the accounting standards are
> all over the open web, so what this adds there is verifiability, not accuracy. Full
> four-arm data, confidence intervals and an explicit "what this does not prove" list:
> [benchmark page](https://open.accountingllm.site/benchmark.html).

## What you get

**Ten tools** (via `@deepseek-ai/dsh-mcp-client`, named `mcp__quaesto_kb__*`).
Seven for the article layer:

| Tool | Answers |
|---|---|
| `list_standards` | What article-style documents exist, per framework (`CAS` / `ASSE` / `TAX` / `CSA`) |
| `search_kb` | Full-text search over articles, decision steps and units |
| `get_article` | Verbatim article text, by standard reference and article number |
| `get_decision_procedure` | How to judge, step by step, each step anchored to articles |
| `check_applicability` | Which framework this entity must apply — size is *computed*, not declared |
| `get_tax_treatment` | Deduction limits, VAT rates, non-creditable input tax, small-business relief |
| `get_tax_accounting_diff` | Where book and tax diverge, and whether the difference is permanent or temporary |

Three for the unit layer — application guidance, interpretations, cases and regulatory
guidance have **no "Article N" structure**, so they are addressed by `stable_id`:

| Tool | Answers |
|---|---|
| `list_documents` | What unit-style documents exist, per framework (`CAS` / `CSA`) |
| `search_units` | Search only unit-style documents; returns `stable_id`s ready for `get_unit` |
| `get_unit` | Verbatim text of one unit, with its source, document number, fetch time and checksum |

**One skill** — `china-accounting-standards`. Tools alone are not enough: a model holding
real source text can still produce a confident conclusion with no anchor, which spends the
knowledge base's credibility on a hallucination. The skill carries the five rules that
matter:

1. No verbatim source, no citation. Practice consensus is not standard text.
2. **Never invent article numbers for unit-style documents.** Application guidance has no
   article structure; "Article 5 of the X Application Guidance" is a fabricated citation.
3. The judgment layer is an AI-generated research draft, not CPA-reviewed. Source text is
   an official transcript; decision procedures are reasoning aids.
4. Entity size is computed from `(industry, revenue, employees, assets)`, never declared —
   thresholds differ by industry.
5. The tax announcement layer (L3) is not yet ingested. Entries flagged `l3_dependency`
   must be re-checked against current circulars.

Plus one **behavioural** rule, the main change in this revision: **verification is for
checking your answer, not for changing it.** Form a judgement first, then look it up; only
revise when the retrieved text *contradicts* that judgement, and say which sentence does the
contradicting. "I found a related article" is not "that article refutes me." Measured on CPA
accounting questions, this rule is worth **+1.7 points** over tools alone (CI [+0.1, +3.4])
— on the same questions, adding the expanded knowledge base by itself was worth +0.0pp.

## Install

```sh
dsh plugin --profile <name> add github:niuniu-869/dsh-plugin-cas-kb#<sha>
```

The package ships plain ESM with no build scripts, so a git install runs nothing on your
machine and needs no `allowBuilds` authorization. Pinning the commit keeps later pushes from
silently changing what you run.

Not on npm yet.

## Verified run

`dsh --profile headless "业务招待费在企业所得税前能扣多少？给出条款依据。"`
("How much business entertainment expense is deductible for CIT? Give the article.")
— the actual tool sequence from that session log:

```
1. skill                              {"name": "china-accounting-standards"}
2. mcp__quaesto_kb__list_standards    {"framework": "TAX"}
3. mcp__quaesto_kb__search_kb         {"q": "业务招待费 税前扣除"}
4. mcp__quaesto_kb__get_tax_treatment {"category": "税前扣除"}
5. mcp__quaesto_kb__get_tax_treatment {"id": "cit-deduct-entertainment"}
6. mcp__quaesto_kb__get_article       {"ref": "中华人民共和国企业所得税法实施条例", "article_no": 43}
```

The answer quoted Article 43 verbatim, marked the no-carry-forward point as inference
rather than statute, classified the gap as a permanent difference, and flagged that the
definition of qualifying revenue lives in the announcement layer this base does not yet cover.

## Coverage and known gaps

- **Article layer** — transcripts of official releases (casc.org.cn, gov.cn,
  fgk.chinatax.gov.cn) with source URL, fetch time and content hash. Historical versions
  are kept separately; superseded documents are labelled.
- **Judgment layer** — 50 decision procedures / 1,681 steps, all AI-generated and **not
  reviewed by a CPA**; every one is served flagged `requires_human_confirmation`. They pass
  automated gates (article numbers must exist, every figure must appear verbatim in the
  article it cites, cross-references must resolve), which catches fabricated citations but
  does not make them professional advice.
- **Unit layer** — transcripts of official releases, with body text mostly extracted from
  the PDF/DOC attachments on the issuing sites (cicpa.org.cn, kjs.mof.gov.cn and others),
  carrying source URL, fetch time, body SHA-256 and attachment checksums. No article
  structure — addressed by `stable_id`. Units marked as *derived ID* have no official
  numbering in the source; their ID comes from layout position and may shift between
  revisions.
- **Auditing standards have no judgment layer** — CSA ships source text only, no decision
  procedures.
- **Not included**: the tax announcement layer (circulars and administrative notices — this
  is where most current preferential rates live) and any copyrighted publication.

## Configuration

Both rows can be overridden by `id` in your own profile patch — for example to point at a
mirror. A patch replaces the whole `config`, so restate every key you need:

```yaml
- id: quaesto-kb-mcp
  config:
    serverName: quaesto_kb
    transport: streamable-http
    url: https://your-mirror.example.com/mcp
    toolCallTimeoutMs: 30000
    failOnStartupError: false
```

`serverName` appears in both rows and in the skill body. Keep them equal, or the skill will
name tools that do not exist.

## Data and privacy

Tool calls go to `api.accountingllm.site` — the query text leaves your machine. The service
requires no account and stores no user identity; it does log the tool name, its arguments
and a daily-salted hash of the caller IP for usage statistics and abuse control, and rate
limits at 120 requests/minute per IP. The plugin itself adds no telemetry of its own.

## Disclaimer

Article text is a transcript; the official releases by the Ministry of Finance and the State
Taxation Administration govern. The judgment layer is a research draft, not reviewed by a
certified public accountant, and is not accounting or tax advice.

MIT licensed. Part of [Quaesto](https://open.accountingllm.site) — accounting
infrastructure for AI agents.
