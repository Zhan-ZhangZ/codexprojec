# statspai_hdfe

PyO3 + Rayon HDFE group-demean kernel for [StatsPAI](https://github.com/brycewang-stanford/StatsPAI).

See
[`docs/superpowers/specs/2026-04-20-v095-rust-hdfe-spike.md`](../../docs/superpowers/specs/2026-04-20-v095-rust-hdfe-spike.md)
on the parent repo for the full rollout plan.

## Build

```bash
pip install maturin
cd rust/statspai_hdfe
maturin develop --release     # dev-time install into current venv
# or
maturin build --release       # produce a wheel for redistribution
```

After install, verify activation from the parent repo:

```bash
python -c "from statspai.fast.demean import _HAS_RUST; print('rust:', _HAS_RUST)"
python -c "from statspai.core._numba_kernels import _HAS_RUST_CLUSTER; print('cluster:', _HAS_RUST_CLUSTER)"
```

## Exposed kernels

| Function | Purpose | Parallelism |
| --- | --- | --- |
| `group_demean` | Legacy single-FE in-place demean | none |
| `demean_2d` | K-way alternating-projection demean (Fortran in-place) | Rayon over columns |
| `demean_2d_weighted` / `_sorted` | Weighted variants for IRLS-internal demean | Rayon over columns |
| `fepois_irls` | Full Poisson IRLS inner loop (Phase B) | Rayon over columns |
| `singleton_mask` | Iterative K-way singleton-row detection | none |
| `separation_mask` | Iterative Poisson-separation detection | none |
| `cluster_meat` *(0.7)* | Cluster-robust sandwich meat matrix `Σ_g (X_g'r_g)(X_g'r_g)ᵀ` | Rayon over clusters |

## Phases

- **Phase 1:** single-threaded `group_demean` reference.
- **Phase 2 (legacy):** wire into `statspai.panel.hdfe` with numba fallback.
- **Phase 3 (legacy):** Rayon-parallelised `group_demean_block`.
- **Phase 4:** `cibuildwheel` matrix (macOS arm64/x86_64,
  manylinux_2_17 x86_64/aarch64, musllinux_1_2 x86_64, Windows x86_64).
- **Phase B (0.6):** Poisson IRLS + separation detection.
- **Phase 2 of post-fixest catch-up (0.7-alpha.1):** `cluster_meat`
  with Rayon over clusters; wired into
  [`statspai.core._numba_kernels.cluster_meat`](../../src/statspai/core/_numba_kernels.py)
  with the numba kernel as automatic fallback.

## Contract

Every release on this branch must:

1. Bit-identically reproduce the NumPy reference kernel on 16+ DGPs
   (`atol=1e-10`).
2. Pass `statspai.fast.hdfe_bench` correctness gate when built into
   the current venv (see `--atol 1e-10`).
3. Never require end users to install Rust at `pip install` time —
   missing wheels must fall back to the Python path silently.
