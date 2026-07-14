# RFC: `import statspai` time optimization (D2)

**Status:** proposed — handoff to the `__init__.py` / `registry.py` owner.
**Author:** correctness/perf pass, 2026-05-29.

## Problem

Cold `import statspai` is ~0.7–0.9 s. Profiling (`python -X importtime`) shows
the cost is dominated by **eager submodule loading**, not any single library:

- `statspai.regression.ols` → `scipy.stats._stats_py` ≈ 460 ms (first/primary
  trigger of `scipy.stats`).
- `statspai.core.results` → `pandas` ≈ 266 ms (unavoidable; core dependency).
- **416 statspai submodules are imported eagerly** during `import statspai`
  (synth.\*, timeseries.\*, tmle.\*, structural.\*, … all loaded up-front).

## Why "just defer scipy.stats" does NOT work

Empirically tested: installing `importlib.util.LazyLoader` for `scipy.stats`
**does not** defer it — ~230 eager modules access `stats.<attr>` at
*module-execution* time (e.g. `synth.kernel`'s module-level dispatch table),
which triggers the lazy load immediately. Per-file conversion of all ~230
modules is disproportionate risk for marginal benefit: scipy.stats loads the
moment any estimator runs, so the realized win only covers `import`-and-never-
estimate paths.

`matplotlib` was the one cleanly-deferrable eager import and is already handled
(see `plots/__init__.py` one-shot pyplot CJK hook).

## Optimal fix (root cause)

Attack the eager-submodule loading directly, in three coordinated changes:

1. **Extend `_LAZY_SUBMODULES` / `_LAZY_ATTRS`** so the heavy families
   (`synth`, `timeseries`, `tmle`, `structural`, `spatial`, `frontier`,
   `multilevel`) resolve on first `sp.<name>` access via the existing PEP 562
   `__getattr__`, instead of being imported at package init. Keep only the
   high-frequency core surface (regression/OLS-IV, did, core.results) eager.

2. **Do not build the registry at import.** Ensure `_ensure_full_registry`
   (which walks `statspai.__all__` and would force every submodule import) is
   triggered lazily — on the first `sp.help` / `sp.list_functions` /
   `sp.function_schema` call — never during `import statspai`.

3. **Serve discovery from the pre-built JSON bundle.** `schemas/functions.json`
   / `tools.json` / `agent_cards.json` already exist (`scripts/dump_schemas.py`).
   Back `sp.list_functions()` / `sp.function_schema(name)` with the bundle so
   agent discovery needs **zero** module imports. Fall back to the live
   registry only when a name is missing from the bundle (drift) — and gate that
   drift in CI (`dump_schemas.py --check` already exists).

Net effect: `import statspai` drops to roughly pandas + numpy + a thin glue
layer; `scipy.stats` (and the heavy families) defer **for free**, with no
per-file churn.

## Verification

- `python -X importtime -c "import statspai"` cumulative < 350 ms.
- `python -c "import sys; import statspai; assert 'scipy.stats' not in sys.modules"`.
- `sp.did(...)`, `sp.synth(...)` etc. still resolve (lazy `__getattr__`).
- `sp.list_functions()` count unchanged; `dump_schemas.py --check` green.
- Full test suite green (lazy attrs must not change any public behavior).

## Risk

Medium — touches the package's import topology. Mitigated by: (a) the lazy
mechanism (`_LAZY_SUBMODULES`/`_LAZY_ATTRS`) already exists and is proven;
(b) a CI assertion `all(hasattr(sp, n) for n in sp.list_functions())` catches
any name that fails to resolve lazily.

## Owner

`__init__.py` + `registry.py` maintainer (do NOT split across agents — these
two files are tightly coupled on the eager/lazy boundary).

## Addendum (2026-05-29): the scipy.stats win is blocked by `regression.ols`

Empirically: `_ensure_full_registry()` is already lazy (called from
`list_functions`/`help`, NOT at import), so deferring the heavy families
(synth/timeseries/tmle/frontier) is feasible. BUT `regression.ols` is eager
(core API, bound at `__init__` import) and is the **first** importer of
`scipy.stats` — so scipy.stats loads regardless of what else is deferred.
Deferring the heavy families therefore only saves *their own* module-exec
time, not the ~460ms scipy.stats cost. And since virtually every estimator
needs scipy.stats, real workflows pay it on the first call anyway. Net: the
headline import-time win is small for realistic usage, and the change is broad
and high-risk on the most-contended file (`__init__.py`). Recommendation: do
this only as a deliberate, owner-driven pass, not opportunistically.
