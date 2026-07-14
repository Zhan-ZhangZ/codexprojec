---
name: gh-address-comments
description: GitHub PR Code Review 自动回复与代码整改助手。读取 PR 下的评审意见，对问题进行自动归类并询问用户确认，随后结合上下文生成修复补丁，自动解决 Review 阻碍。Leading Words: GitHub PR评审回复, Code Review问题整改, 自动修复审查意见, PR交互式排障
metadata:
  short-description: Address comments in a GitHub PR review
---

# PR Comment Handler

Guide to find the open PR for the current branch and address its comments with gh CLI. Run all `gh` commands with elevated network access.

Prereq: ensure `gh` is authenticated (for example, run `gh auth login` once), then run `gh auth status` with escalated permissions (include workflow/repo scopes) so `gh` commands succeed. If sandboxing blocks `gh auth status`, rerun it with `sandbox_permissions=require_escalated`.

## 1) Inspect comments needing attention
- Run scripts/fetch_comments.py which will print out all the comments and review threads on the PR

## 2) Ask the user for clarification
- Number all the review threads and comments and provide a short summary of what would be required to apply a fix for it
- Ask the user which numbered comments should be addressed

## 3) If user chooses comments
- Apply fixes for the selected comments

Notes:
- If gh hits auth/rate issues mid-run, prompt the user to re-authenticate with `gh auth login`, then retry.
