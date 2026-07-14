---
name: agent-deep-links
description: 跨 IDE 协议深层跳转链接 (Deep Links) 构建与强验工具。专用于将晦涩的终端路径转化为能在 Slack / Discord 一键唤醒的超链接URI。支持 Cursor、VS Code 及 Codex 原生协议，并包含协议头可用性兜底诊断。Leading Words: 跨IDE协议Deep Links构建, Slack超链接快速唤醒, Cursor/VSCode协议头, 终端路径状态验证诊断
---

# Agent Deep Links

## Overview

Use this skill when a user asks for clickable links that should open directly in an app (usually from Slack). This includes verifying whether a target app supports deep links at all, selecting the right URL shape, and providing fallbacks when deep links are unsupported.

## Workflow

1. Identify target app + target object:
   - Thread/conversation
   - File/folder
   - Settings/new window
2. Read `references/deep-link-matrix.md` for known-good link formats and support level.
3. If support is unknown, verify locally before sending:
   - Check URL schemes in the app bundle:
     ```bash
     /usr/libexec/PlistBuddy -c 'Print :CFBundleURLTypes' /Applications/<App>.app/Contents/Info.plist
     ```
   - Smoke test launch behavior:
     ```bash
     open '<scheme>://...'
     ```
4. Construct Slack-safe link syntax:
   - `<url|label>`
5. If unsupported or uncertain, send a fallback:
   - Plain path + command
   - Documented CLI open command
   - Statement that no official deep-link format is known

## Output Rules

- Prefer absolute paths for file/folder links.
- Keep labels short and action-oriented (`Open in Cursor`, `Open in Codex`).
- Do not claim deep-link support unless it is in the matrix or just verified.
- For uncertain app routes, clearly mark as inferred/experimental.

## Common Templates

- Codex thread:
  - `<codex://threads/<thread-uuid>|Open in Codex>`
- Cursor file:
  - `<cursor://file/<absolute-path>:<line>:<column>|Open in Cursor>`
- VS Code file:
  - `<vscode://file/<absolute-path>:<line>:<column>|Open in VS Code>`
- VS Code Insiders file:
  - `<vscode-insiders://file/<absolute-path>:<line>:<column>|Open in VS Code Insiders>`

Use `references/deep-link-matrix.md` for the full cross-app matrix and support notes.
