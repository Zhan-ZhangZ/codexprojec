# Baseline Snapshot

Collected on 2026-06-21 before edits in this run.

## Repository State

- Root `StatsPAI`: `main...origin/main`, clean.
- `Paper-JSS/`: `main...origin/main`, clean.
- `CausalAgentBench/`: `main...origin/main`, clean.

Additional root worktrees exist and are treated as parallel lanes:

- `/Users/brycewang/Documents/GitHub/StatsPAI-improve-wt`
  on `improve/parity-bugfix-docs`, ahead 4 / behind 184, with untracked
  `_wave1_tierD_anchors_optional/`.
- `/Users/brycewang/Documents/GitHub/StatsPAI-wt-synth`
  on `cov/synth-rd-finish`, with untracked `.cov_wt/`.
- `/Users/brycewang/Documents/GitHub/StatsPAI/.claude/worktrees/improve-correctness`
  on `worktree-improve-correctness`, ahead 7.

## Initial Diagnostics

- Registry: 1108 functions across 83 submodules.
- Tier-D worklist: 6 estimator-like functions, all `network`.
  - P1: `assortativity`, `degree_centrality`.
  - P2: `bonacich_power`, `centrality`, `katz_centrality`,
    `network_components`.
- `scripts/quality_gate.py all` before this run:
  - flake8 observed 1010 with stale baseline 4698.
  - mypy observed 0 because mypy 2.1.0 emitted a config warning for
    `python_version = "3.9"` but exited 0.
  - import-budget, agent-cards, result-protocol, and error-taxonomy gates
    passed.
- Error taxonomy audit:
  - taxonomy raises: 1429
  - generic raises: 1361
  - broad exception handlers: 589
- Schema and help:
  - `scripts/dump_schemas.py --check` passed.
  - `scripts/help_coverage.py --check` passed.

## First Owned Files

- `plans/2026-06-21-statspai-hardening-month/`
- `tests/test_network.py`
- `scripts/quality_gate.py`
- `pyproject.toml`
