# Driving StatsPAI as an agent

StatsPAI is designed so an LLM agent and a human use the *same* entry
points. This guide is the operational playbook for an agent: how to
discover the surface, run a defensible analysis, chain results without
re-sending data, and recover from failures — all from machine-readable
metadata, no source reading required.

For the lower-level tool/JSON-RPC reference see
[`agent_api.md`](agent_api.md); this page is the workflow on top of it.

## The recommended loop

```text
detect_design → preflight → recommend → fit(as_handle=True)
              → audit_result → sensitivity_from_result → bibtex
```

1. **`detect_design(data)`** — infer the study shape (panel / cross-section
   / RD / IV) when the user just hands you a table.
2. **`preflight(data, method=...)`** — surface design blockers *before*
   fitting (overlap, cohort sizes, weak-IV F, RD density). Returns a
   `verdict` in `{PASS, WARN, FAIL}` plus per-check detail.
3. **`recommend(data, y, treatment, ...)`** — when unsure which estimator
   fits, get a ranked list with reasoning and preconditions.
4. **Fit with `as_handle=True`** — the server caches the fitted result and
   returns a `result_id` (`r_<hex>`). Chain downstream tools by that id
   instead of re-uploading the dataset.
5. **`audit_result(result_id)`** — a reviewer checklist of the robustness
   checks still missing for this design; each item names a
   `suggest_function` to run.
6. **`sensitivity_from_result` / `honest_did_from_result`** — design-aware
   sensitivity off the same handle (no need to ferry βs / Σ).
7. **`bibtex(keys=[...])`** — verified BibTeX for the methods you used.

## What every result payload gives you

`result.to_dict(detail='agent')` (the shape `execute_tool` returns) carries
both the estimate and the *reasoning scaffolding* an agent acts on:

| field | use |
| --- | --- |
| `estimate` / `se` / `ci` / `pvalue` (causal) or `coefficients` (regression) | the numbers |
| `violations` | assumption/diagnostic problems flagged, each with a `recovery_hint` and `alternatives` |
| `warnings` | human-readable one-liners distilled from `violations` |
| `next_steps` / `suggested_functions` | what to call next, ranked |
| `next_calls` | **ready-to-dispatch** JSON-RPC payloads — copy-paste, don't reconstruct |
| `citations` | verified bib keys + BibTeX bodies pulled from `paper.bib` |
| `narrative` | a short markdown digest to quote in chat |

The agent-facing payload is contract-tested against a published JSON
Schema (`schemas/result.schema.json`), so you can typecheck what you
receive, not just what you send.

## Choosing a tool before you call it

Every registered function exposes a planning card so you decide
*whether* to call it without reading source:

```python
import statspai as sp
sp.agent_card("did")          # assumptions / pre_conditions / failure_modes
                              #   / alternatives / typical_n_min
sp.function_schema("did")     # OpenAI function-calling schema
sp.describe_function("did")   # full metadata dict
```

- **`assumptions`** — the identifying assumptions this estimator needs.
- **`pre_conditions`** — data-shape checks to verify first.
- **`failure_modes`** — `{symptom, exception, remedy, alternative}`. When a
  call raises the named exception, the `remedy` and `alternative` tell you
  how to recover. Every `alternative` is guaranteed to resolve to a real
  `sp.*` function (CI-enforced), so following a recovery hint never dead-ends.
- **`alternatives`** — ranked fallbacks when this estimator is a poor fit.
- **`validation_status`** — `certified` (cross-language or published-reference
  parity) / `validated` (known-truth, reference, external, coverage, or
  explicit convention evidence) / `api_stable`. Prefer higher tiers when the
  user needs audited numerical evidence, but treat `api_stable` as an API
  contract rather than numerical validation.

## Offline discovery (no Python import)

Run `python scripts/dump_schemas.py` to emit a versioned, import-free
bundle under `schemas/` that a non-Python runtime can read directly:

| file | contents |
| --- | --- |
| `tools.json` | MCP tool manifest (input schemas) — how to call each tool |
| `functions.json` | OpenAI function schemas for every registered function |
| `agent_cards.json` | the planning cards (assumptions / failure modes / …) |
| `result.schema.json` | JSON Schema for the agent result payload |
| `index.json` | version + counts provenance |

`scripts/dump_schemas.py --check` fails CI if the bundle drifts from the
live package, so the offline artifact never goes stale.

## Failure handling

Tool errors come back as envelopes, never as crashes:

```json
{"error": "could not extract event-study coefficients ...",
 "hint": "re-run with an event-study specification first",
 "upstream_error": "..."}
```

Read `hint` / `upstream_error`, consult the offending function's
`failure_modes`, and route to the suggested `alternative`. A stale
`result_id` (evicted from the LRU cache) returns a clear "not found"
error — just re-fit with `as_handle=True`.

## Citations: never invent one

Citations only ever come from `paper.bib`. The enrichment layer derives a
tool's bib keys from its verified `reference` field and ships the BibTeX
body; a key that does not resolve in `paper.bib` is silently dropped rather
than surfaced. If you need a citation an estimator does not provide, call
`bibtex(keys=[...])` — do **not** synthesise one.

## LLM-in-the-loop (DAG proposal)

When StatsPAI runs as an MCP server and the connected client advertises
`capabilities.sampling`, the LLM-DAG helpers can reuse *your* model via a
server→client `sampling/createMessage` round-trip — no extra API key:

```python
from statspai.causal_llm.sampling_client import resolve_llm_client
client = resolve_llm_client()          # SamplingLLMClient if sampling is
                                       # advertised, else None
sp.llm_dag_propose(variables, client=client)   # None → deterministic heuristic
```

If sampling is unavailable the helpers fall back to the offline heuristic
backend — they never hard-fail for lack of an LLM.
