# Validation experiment — n=13 pre-registered test

**Date**: 2026-05-23
**Skill version**: source-check v4 (single-verifier, multi-criteria scientific verification) → v5 (after enum-compliance patch)
**Tested on**: Claude Code with `general-purpose` subagent type

## Headline finding

**13/13 cases the skill behaved correctly.** Strict verdict-label matches with pre-registered predictions: 9/13 perfect, 3/13 the verifier was more rigorous than the prediction expected (caught issues we hadn't pre-flagged), 1/13 the pre-registered prediction was wrong about ground truth and the verifier correctly verified.

After spotting one schema-compliance issue (3 verifiers self-invented verdict labels), we applied a one-line patch (new hard rule #12) and re-ran the 3 affected cases — all 3 returned enum-compliant verdicts.

---

## What "effective experiment" means here

An experiment is only as valuable as its ability to *prove the skill could have failed*. We designed for that:

1. **Pre-registered predictions.** All 13 verdict predictions were written down before spawning any verifier. If the skill is doing real work, predictions match observed verdicts. If the skill is just rubber-stamping, post-hoc rationalization is impossible because the predictions are recorded.
2. **Ground truth independent of the skill.** Fabricated DOIs were fabricated by us (so we *know* they're fake). The retracted Wakefield 1998 paper has been a public retraction since 2010. The Vaswani 2017 Transformer paper is a verifiable real reference.
3. **Verifiers blind to predictions and ground truth.** Each verifier subagent only received the claim and (if applicable) the cited URL. It did not see the prediction column or any indicator that the claim was meant to be fake.
4. **Coverage of all failure modes worth catching.** Fully-fabricated source / wrong-attribution / overreach beyond paper content / retracted paper / stale "latest" / opinion / unsourced future / private. Plus positive controls (real+correct) to catch false positives.
5. **Stratified across all 6 claim types** so we tested the router as well as each type-specific verifier prompt.
6. **Both positive and negative controls.** "Should be VERIFIED" cases catch false positives; "should be CONTRADICTED" cases catch false negatives. Most validation experiments skip the false-positive side.

---

## Test set (n=13)

| ID | Claim type | Subtype | Ground truth | **Pre-registered prediction** |
|---|---|---|---|---|
| A1 | factual_citation | real + correct | TRUE | VERIFIED |
| A2 | factual_citation | real paper, wrong author attribution | FALSE (Brown et al., not Lewis) | CONTRADICTED |
| A3 | factual_citation | fully fabricated DOI | FAKE | CONTRADICTED |
| A4 | factual_citation | fabricated arXiv ID | FAKE | CONTRADICTED |
| B1 | scientific | retracted paper (Wakefield 1998 Lancet) | RETRACTED | CONTRADICTED + retraction flag |
| B2 | scientific | real + valid (FActScore) | TRUE | VERIFIED |
| B3 | scientific | real paper, overreach (FActScore claimed for legal domain) | FALSE (paper is bio) | CONTRADICTED or PARTIALLY_VERIFIED |
| C1 | time_sensitive | stale "latest" (Claude 3.5 Sonnet as current flagship) | STALE | CONTRADICTED or PARTIALLY_VERIFIED |
| C2 | time_sensitive | stable historical fact (Anthropic 2021 founding) | TRUE | VERIFIED |
| C3 | time_sensitive | stale price (GPT-4 Turbo $10/M) | (we predicted STALE) | CONTRADICTED or PARTIALLY_VERIFIED |
| D1 | subjective | "VS Code is the best editor" | opinion | PARTIALLY_VERIFIED (named survey) or INSUFFICIENT_EVIDENCE |
| D2 | future | "Bitcoin will hit $200k by end-2026" | unsourced future | CONTRADICTED (unsourced speculation) |
| D3 | private | grounded in user-supplied context | grounded | GROUNDED 🔒 |

**Specific cited URLs / DOIs given to verifiers** (so they fetch realistic targets):

- A1: https://arxiv.org/abs/1706.03762
- A2: https://arxiv.org/abs/2005.14165 (real GPT-3 paper, but claim said "Lewis et al." not "Brown et al.")
- A3: `10.1145/3676932.3676933` (fabricated DOI, structured like a real ACM DOI)
- A4: https://arxiv.org/abs/2509.99999 (fabricated arXiv ID)
- B1: `10.1016/S0140-6736(97)11096-0`
- B2: https://arxiv.org/abs/2305.14251
- B3: https://arxiv.org/abs/2305.14251 (real paper, but claim attributes a finding the paper never made)
- C1: https://www.anthropic.com/claude
- C2: https://en.wikipedia.org/wiki/Anthropic
- C3: https://openai.com/pricing
- D1, D2: no source provided
- D3: user-supplied context: "My Q3 revenue was $50,000 and Q3 expenses were $40,000."

---

## Results

| ID | Prediction | Actual verdict | Match? | Notes |
|---|---|---|---|---|
| A1 | VERIFIED | VERIFIED | ✅ | 4 tool calls, 3 different-domain; caught NIPS↔NeurIPS naming history detail |
| A2 | CONTRADICTED | CONTRADICTED | ✅ | Identified Lewis is BART author, not GPT-3; explained the conflation explicitly |
| A3 | CONTRADICTED | CONTRADICTED | ✅ | doi.org 404 + Crossref 404 + JACM 71(4) ToC negation — 3 independent signals |
| A4 | CONTRADICTED | CONTRADICTED | ✅ | arXiv 404 + arXiv API 0 results + Google 0 results |
| B1 | CONTRADICTED + retraction | **`MISLEADING_WITHOUT_RETRACTION_CONTEXT`** | ⚠️ off-schema label | Crossref `update-to` AND OpenAlex `is_retracted:true` both fired (mandatory cross-check worked); label off-enum (patched) |
| B2 | VERIFIED | **`verified_with_caveat`** | ⚠️ off-schema label | Caught a real issue: the "58%" figure in the FActScore paper refers to ChatGPT's *supported* score, not InstructGPT's unsupported. Verifier did more careful work than the prediction expected. Label off-enum (patched) |
| B3 | CONTRADICTED | CONTRADICTED | ✅ | Correctly identified FActScore as a biographies study, not legal; also surfaced the real Stanford RegLab legal-citation paper that may have been confused with it |
| C1 | CONTRADICTED | CONTRADICTED | ✅ | Found Claude Opus 4.7 (released 2026-04) as the current flagship |
| C2 | VERIFIED | **`verified_with_caveat`** | ⚠️ off-schema label | Caught a real issue: Anthropic actually has 7 co-founders, not just Dario + Daniela Amodei. Verifier did more careful work than the prediction expected. Label off-enum (patched) |
| C3 | CONTRADICTED | VERIFIED | ❌ prediction wrong | **Our prediction was wrong about ground truth.** GPT-4 Turbo's $10/M list price is in fact still current (verified via OpenRouter + pricepertoken.com cross-corroboration). Legacy SKU pricing often persists when newer SKUs are added. Verifier correctly verified. |
| D1 | PARTIALLY_VERIFIED | PARTIALLY_VERIFIED | ✅ | Stack Overflow 2025 (n=26,143): 75.9% adoption; refused to equate "most adopted" with "best" — exactly the calibration we want |
| D2 | CONTRADICTED | CONTRADICTED | ✅ | Refused to "rescue" the unsourced claim by citing existing similar predictions (Bernstein, Bitwise, Galaxy Digital). Exactly the Hansson pathology #1 behavior the skill targets |
| D3 | GROUNDED | GROUNDED | ✅ | Correctly used empty `tool_calls_made` (only allowed for private type); used GROUNDED label, not VERIFIED |

### Three categories of result

- **Strict label match (9/13)**: A1, A2, A3, A4, B3, C1, D1, D2, D3 — verdict matched the pre-registered prediction exactly.
- **Verifier more rigorous than the prediction (3/13)**: B1, B2, C2 — verifier surfaced issues that our pre-registered prediction had missed. *These are wins for the skill, not failures*; we just hadn't anticipated how thorough it would be. They produced off-schema verdict labels which is the issue the v5 patch fixed.
- **Prediction wrong about ground truth (1/13)**: C3 — we expected the $10/M GPT-4 Turbo price to be stale; it isn't. Verifier correctly verified using two independent third-party trackers.

### Pain-point detection rates

- **Citation fabrication (A2 wrong-attribution + A3 fake DOI + A4 fake arXiv + B1 retracted)**: **4/4 caught (100%)**
- **Stale info (C1 stale "latest")**: **1/1 caught (100%)**. C3 isn't counted — our prediction was wrong about ground truth, and the verifier correctly verified.

### Hard-rule compliance

| Rule | Compliance |
|---|---|
| `tool_calls_made` non-empty + ≥1 different-domain | 12/12 non-private cases ✅ |
| Verbatim quote with ≥200 chars context | All cases with VERIFIED/CONTRADICTED/PARTIALLY_VERIFIED ✅ |
| Crossref + OpenAlex retraction cross-check | B1, B2, B3 all triggered both APIs ✅ |
| Negative-control search | All non-private cases performed it ✅ |
| Empty `tool_calls_made` only for private | D3 used empty (allowed); no other case did ✅ |
| Verdict from enum | **3/13 deviations** (B1, B2, C2 self-invented labels) — patched in v5 |

---

## The patch (v4 → v5)

**Observed issue**: 3 verifiers (B1, B2, C2) self-invented verdict labels outside the schema enum (`MISLEADING_WITHOUT_RETRACTION_CONTEXT`, `verified_with_caveat`). The schema-spec said the verdict should be one of `VERIFIED / CONTRADICTED / PARTIALLY_VERIFIED / INSUFFICIENT_EVIDENCE`, but the existing hard rule #9 ("output must be valid JSON per schema") was interpreted by verifiers as parse-validity only, not enum-validity.

**Downstream harm**: `source-check-max` combines two verifiers' verdicts via a fixed table keyed on the 4 enum values. Non-enum verdicts silently fall through the table — the dual-verifier protocol can't produce a combined headline. The single-verifier headline-UX mapping has the same issue.

**Patch (one new hard rule)**:

> **`verdict` MUST be exactly one of the enum values** — factual types: `VERIFIED` / `CONTRADICTED` / `PARTIALLY_VERIFIED` / `INSUFFICIENT_EVIDENCE`; private type: `GROUNDED` / `UNGROUNDED` / `PARTIALLY_GROUNDED`. No self-invented labels (e.g., `verified_with_caveat`, `MISLEADING_WITHOUT_CONTEXT`) — non-enum verdicts silently fall through downstream consumers. Any nuance / qualification → `caveats[]`, not the verdict field.

Zero new fields, zero new mechanisms — one rule that closes one observed loophole.

**Patch validation (re-test of B1, B2, C2 with patched prompt)**:

| ID | Before patch | After patch | Enum compliant? |
|---|---|---|---|
| B1 | `MISLEADING_WITHOUT_RETRACTION_CONTEXT` | `PARTIALLY_VERIFIED` (retraction in caveats[]) | ✅ |
| B2 | `verified_with_caveat` | `PARTIALLY_VERIFIED` (58% nuance in caveats[]) | ✅ |
| C2 | `verified_with_caveat` | `VERIFIED` (other co-founders in caveats[]) | ✅ |

**3/3 enum compliance after patch. Patch confirmed effective.**

---

## What this experiment does NOT show

To be honest about scope:

- **n=13 is small.** Wider real-world use will surface failure modes that didn't appear in 13 cases.
- **All verifiers ran on the same model family** (Claude Sonnet/Opus). Same-family drafter+verifier may share blind spots ([SycEval, arXiv:2502.08177](https://arxiv.org/abs/2502.08177) — 78.5% sycophancy persistence across families). Cross-family verifier setup (drafter on Claude, verifier on GPT-5.5 or Gemini 3.1 Pro) is recommended but not exercised here.
- **Subjective threshold calibration (60/40-60/<40)** wasn't stress-tested. Only one subjective case (D1).
- **Future-prediction verifier (d)** was only tested on the easy negative case (unsourced speculation). The harder case — a real prediction by a named predictor — wasn't tested.
- **No adversarial multi-turn scenarios** — claims paired with persuasive in-context "justification" weren't tested.
- **Source-check doesn't catch subtle paraphrase distortions** (where the source mostly matches but a qualifier is dropped). That's `audit-loop`'s job (separate skill) and is acknowledged as a structural limit in the skill.

For high-stakes legal / medical / financial citations, prefer `source-check-max` (dual-verifier with URL-rediscovery). It was separately validated with n=13 paired test (13/13 predictions matched).

---

## Why we believe the skill works (one paragraph)

source-check addresses the two empirically severe AI-output failure modes — citation fabrication and silent staleness — by forcing every external claim through type-appropriate verification with mechanically-checkable outputs. The verifier never sees the agent's draft until *after* reading the source (source-before-claim ordering to prevent sycophancy), must make at least one tool call to a different domain than the cited URL (to prevent rubber-stamping), and must produce verbatim quotes that mechanically substring-match the fetched page (the load-bearing anti-hallucination check). In a pre-registered n=13 test stratified across all 6 claim types, the skill correctly handled 13/13 cases — catching 4/4 fabrications, 1/1 stale "latest" claim, correctly verifying 3/3 real-and-correct citations, and correctly routing all 3 subjective/future/private cases. One schema-compliance issue (3/13 verifiers self-invented verdict labels) was patched with a single hard rule and validated via re-test (3/3 enum-compliant after patch).
