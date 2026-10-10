#!/usr/bin/env node
/**
 * Pre-pack guard for octocode-mcp.
 *
 * Rust addons are distributed through npm optionalDependencies on
 * @octocodeai/octocode-engine.
 *
 * Ripgrep is no longer a separate dependency or bundled binary — it runs
 * in-process inside the native engine (the `searchRipgrep` export), so there
 * are no rg runtime files to ship.
 */
console.error('✓ octocode-mcp prepack: npm runtime assets are dependency-owned.');
