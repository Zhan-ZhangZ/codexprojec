//! Secret detection & content sanitization.
//!
//! Merged from the former `octocode-security` crate. The canonical pattern list
//! lives in `security/regexes/*.ts` and is compiled into `patterns.rs` by
//! `scripts/gen-patterns.mjs` (run from `prebuild.cjs`), so Rust evaluation order
//! matches the TypeScript fallback in `security/native.ts`.

pub mod detector;
pub mod patterns;
pub mod sanitizer;
pub mod types;
