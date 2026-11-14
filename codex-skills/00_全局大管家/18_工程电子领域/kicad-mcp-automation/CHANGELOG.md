# 📋 Changelog

All notable changes to **KiCad MCP** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

# 1.0.0 (2025-10-04)


### Bug Fixes

* add missing KiCad client methods and fix MCP type errors ([295002c](https://github.com/muammar-yacoob/kicad-mcp/commit/295002cd60091d58ce9085dc6d057a49564e610a))
* add start script for MCP server ([fb5ab9d](https://github.com/muammar-yacoob/kicad-mcp/commit/fb5ab9d4f9ce8a8d411294eb6e67ef160aed4eb0))
* remove console.log breaking JSON responses and fix all ESLint errors ([ba709b2](https://github.com/muammar-yacoob/kicad-mcp/commit/ba709b278e6430d6f4ba96963abf0a4493e8b2d2))
* use standard GITHUB_TOKEN instead of PAT_GITHUB ([cff63ed](https://github.com/muammar-yacoob/kicad-mcp/commit/cff63edd42f35da50a228c5c9010de558c3d311c))


### Features

* enhance release workflow with intelligent triggering and distribution packages ([1843109](https://github.com/muammar-yacoob/kicad-mcp/commit/1843109756579af8fe05ebadfe572aa675774e5a))
* implement file-based KiCad client with real file generation ([4ecbf93](https://github.com/muammar-yacoob/kicad-mcp/commit/4ecbf93b8ba57b0ffefca9fd134a4a2193fce730))
* implement project creation with templates and prompt parsing ([71f725d](https://github.com/muammar-yacoob/kicad-mcp/commit/71f725d4ae2733785dd4406ee2a2feea96361c7b))
* integrate semantic-release for automated versioning and publishing ([7c21611](https://github.com/muammar-yacoob/kicad-mcp/commit/7c21611c42dc70bd83787ba47fce951b08ecc8f8))
* remove husky and simplify development workflow ([7e26cf8](https://github.com/muammar-yacoob/kicad-mcp/commit/7e26cf8f375a977dd8d4f94d740e86f03ff840d2))
* upgrade to modern tooling stack with Bun + Biome ([261c350](https://github.com/muammar-yacoob/kicad-mcp/commit/261c3508c0af77433ea097c296872aff671079fa))


### BREAKING CHANGES

* Removed git hooks and lint-staged configuration

Benefits:
- Eliminates semantic-release conflicts
- Faster commits without pre-commit checks
- Simpler CI/CD pipeline
- Less configuration complexity

Changes:
- Remove .husky directory and all git hooks
- Remove lint-staged configuration
- Remove husky and lint-staged dependencies
- Simplify package.json scripts
- Clean up workflow configuration

Code quality is now enforced via:
- GitHub Actions CI/CD
- Manual biome commands when needed
- Developer discretion
* Switched from pnpm to Bun and ESLint/Prettier to Biome

Performance improvements:
- 3-5x faster installs with Bun
- 10-100x faster linting/formatting with Biome
- Reduced bundle size and complexity

Tooling changes:
- Replace pnpm with Bun package manager
- Replace ESLint + Prettier with Biome
- Update all scripts to use Bun
- Modernize lint-staged configuration
- Remove legacy ESLint config files

Developer experience:
- Faster CI/CD builds
- Simplified configuration
- Better error messages
- Zero-config setup
* Replaces MockKiCadClient with FileKiCadClient as default

- Created Python bridge (kicad_bridge.py) using kiutils library
- Implemented FileKiCadClient that generates real .kicad_pro, .kicad_sch, .kicad_pcb files
- Added 3D model generation via KiCad CLI (STEP/VRML formats)
- Updated documentation to reflect file-based implementation
- Created SETUP.md with comprehensive installation instructions
- Added requirements.txt for Python dependencies (kiutils)

The MCP now creates actual KiCad files that can be opened and edited in KiCad software.

Components:
- Python bridge handles file generation via kiutils
- TypeScript FileKiCadClient spawns Python process for file operations
- KiCad CLI integration for 3D model export

Prerequisites:
- Python 3 with kiutils package (required)
- KiCad with CLI tools (optional, for 3D export)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

## [2.0.1](https://github.com/mcpdotdirect/template-mcp-server/compare/v2.0.0...v2.0.1) (2025-04-01)

# [2.0.0](https://github.com/mcpdotdirect/template-mcp-server/compare/v1.0.2...v2.0.0) (2025-04-01)

### Bug Fixes

- fixed missing deps ([4544887](https://github.com/mcpdotdirect/template-mcp-server/commit/4544887fad7864041a501aff566e225dfb67515d))

### Features

- implementing FastMCP standard for templates ([fc035eb](https://github.com/mcpdotdirect/template-mcp-server/commit/fc035eb91555545bf3cb585db90f11d043ab8d27))

## [1.0.2](https://github.com/mcpdotdirect/template-mcp-server/compare/v1.0.1...v1.0.2) (2025-03-22)

## [1.0.1](https://github.com/mcpdotdirect/template-mcp-server/compare/v1.0.0...v1.0.1) (2025-03-22)

### Bug Fixes

- typo ([4c12f4b](https://github.com/mcpdotdirect/template-mcp-server/commit/4c12f4b8a84310656882b6fa0ce0f78a98bd2eaf))

### Features

- add CLI tool for creating MCP server projects and update package.json ([8e1191e](https://github.com/mcpdotdirect/template-mcp-server/commit/8e1191e0e9e299fd0e02c4822d2141c64fe8d57e))
