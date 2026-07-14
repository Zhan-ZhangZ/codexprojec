# HOME-ASSISTANT-MCP-SERVER Development Guide

## Commands

- Build: `bun run build`
- Start: `bun run start`
- Dev mode: `bun run dev` (watches for changes)
- Lint: `bun run lint`
- Format: `bun run format`
- Test all: `bun test`
- Test watch: `bun test --watch`
- Single test: `bun test path/to/test.ts`
- Build & start: `bun run start`

## Code Style

- TypeScript with ES modules (requires .js extension in imports)
- Use 2-space indentation with semicolons required
- camelCase for variables/functions, PascalCase for classes/interfaces
- Prefix unused variables with underscore
- Follow Model Context Protocol specifications

## Cursor Rules

- Run `bun test` before and after making changes
- Fix build problems before addressing linting issues
- Use `bun run build` to verify compilation
- Format markdown files with Prettier

## Environment

- Bun runtime required
- ES2022 target with NodeNext module resolution
