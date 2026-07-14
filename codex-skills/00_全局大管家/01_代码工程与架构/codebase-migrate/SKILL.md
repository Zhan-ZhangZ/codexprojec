---
name: codebase-migrate
description: 执行超大规模代码库迁移与多文件批量重构的自动化管家。深度集成 Composio CLI，通过自动化 Issue 追踪、分批次提交 PR 以及 CI 自动化校验，实现在本地安全、稳定地跨越数百个文件执行代码 AST 转换或重构操作。Leading Words: 大规模代码重构, 批量文件迁移, AST转换, Composio CI/CD集成, 自动化PR管理
metadata:
  short-description: Codebase migrations + multi-file refactors
---

# Codebase Migrate

> ## ⚙️ 前置依赖（本技能包不含，需客户自行安装与授权）
>
> 本技能依赖 **Composio CLI**（独立的 SaaS 命令行客户端），无法随技能包预置，使用前需由客户自行安装并登录授权：
>
> ```bash
> curl -fsSL https://composio.dev/install | bash   # 安装 CLI
> composio login                                    # 登录（打开浏览器）
> composio link github                              # 连接 GitHub（issue/PR/CI 用）
> ```
>
> 首次使用前请先完成安装与授权，否则 agent 执行 `composio` 命令会报错。详见下文「Prereqs」与官方文档 [docs.composio.dev/docs/cli](https://docs.composio.dev/docs/cli)。

Coordinate framework upgrades, API renames, config rewrites, and structural refactors across hundreds of files. Local edits are driven by the agent; the [Composio CLI](https://docs.composio.dev/docs/cli) handles the surrounding ceremony: tracking issues, per-batch PRs, and CI verification.

## When to Use

- Framework upgrade (React 17 → 19, Node 18 → 22, Django 4 → 5).
- API rename across a monorepo (e.g., `getUserById` → `users.byId`).
- Config/format migration (webpack → vite, eslint → biome, jest → vitest).
- Any "change 200 files the same way" task that needs to ship in reviewable slices.

## Prereqs

```bash
curl -fsSL https://composio.dev/install | bash
composio login
composio link github        # for PRs + CI status
composio link linear        # or jira — for migration tracking
```

Local tools the agent will use directly: `git`, `rg`, `jscodeshift`/`ts-morph`/`comby`/`ast-grep` (language-appropriate), and your test runner.

## Planning Phase

1. **Define the transform precisely.** Bad: "migrate to vitest." Good: "replace `jest.mock` with `vi.mock`, swap `jest.fn()` for `vi.fn()`, rename `jest.config.js` → `vitest.config.ts` using template X."
2. **Scope the blast radius:**
   ```bash
   rg -l 'jest\.(mock|fn|spyOn)' | wc -l
   rg -l 'from "jest"' | sort
   ```
3. **File a tracking issue:**
   ```bash
   composio execute LINEAR_CREATE_ISSUE -d '{
     "teamId":"TEAM_ID",
     "title":"Migrate test runner: jest → vitest",
     "description":"Batches of ~25 files. Checkpoint after each PR lands green."
   }'
   ```

## Execute in Reviewable Batches

Loop: pick N files → transform → test → PR → wait for green → merge → next batch.

```bash
# Batch helper: first 25 untouched files matching the pattern
BATCH=$(rg -l 'jest\.mock' | grep -v done.list | head -25)
echo "$BATCH" > batch.list
```

The agent runs the codemod on `batch.list`, then:

```bash
git checkout -b migrate/vitest-batch-03
xargs < batch.list codemod-runner   # e.g. jscodeshift / ts-morph / comby
npm test -- --changed
git add -A && git commit -m "migrate(test): jest → vitest (batch 3)"
git push -u origin migrate/vitest-batch-03

composio execute GITHUB_CREATE_A_PULL_REQUEST -d '{
  "owner":"acme","repo":"app",
  "head":"migrate/vitest-batch-03","base":"main",
  "title":"migrate(test): jest → vitest (batch 3)",
  "body":"Part of LIN-482. 25 files. Codemod: `transforms/jest-to-vitest.ts`."
}'
```

Then poll CI and merge when green:

```bash
composio execute GITHUB_LIST_WORKFLOW_RUNS_FOR_A_REPOSITORY \
  -d '{"owner":"acme","repo":"app","branch":"migrate/vitest-batch-03"}'
```

## Workflow Script

`scripts/migrate-batch.ts`, run per batch via `composio run --file scripts/migrate-batch.ts -- --batch 3`:

```ts
const batch = process.argv[process.argv.indexOf("--batch") + 1];

const pr = await execute("GITHUB_CREATE_A_PULL_REQUEST", {
  owner: "acme", repo: "app",
  head: `migrate/vitest-batch-${batch}`, base: "main",
  title: `migrate(test): jest → vitest (batch ${batch})`,
  body: `Part of LIN-482. See transforms/jest-to-vitest.ts.`
});

await execute("LINEAR_CREATE_COMMENT", {
  issueId: "LIN-482",
  body: `Opened PR #${pr.number}: ${pr.html_url}`
});
```

## Safety Rails

- **One transform per PR.** Never mix a rename with a format change.
- **Keep a `done.list`** of files already migrated so the next batch skips them.
- **Run the full test suite on the last batch**, even if per-batch PRs ran `--changed`.
- **Codemod first, hand-edit second.** If the codemod misses 3 files, patch them manually and note it in the PR body.
- **Roll back per-batch**, not globally. Each PR should revert cleanly.

## Verification Loop

After each merge:

```bash
rg 'jest\.(mock|fn|spyOn)' | wc -l     # should trend to 0
npm test                                # full suite
composio execute GITHUB_LIST_WORKFLOW_RUNS_FOR_A_REPOSITORY \
  -d '{"owner":"acme","repo":"app","branch":"main","event":"push"}' \
  | jq '.workflow_runs[0].conclusion'
```

## Troubleshooting

- **Codemod regex catches too much** → switch to AST-based tooling (`ast-grep`, `ts-morph`) for structural matches.
- **Tests pass locally, CI fails** → pin Node/Python version parity; check `.nvmrc` / `pyproject.toml`.
- **PR too big to review** → cut batch size in half; maintainers won't review 800-line diffs.
- **Conflicts between batches** → rebase the open batch before merging the current one; never force-push merged batches.

Full CLI reference: [docs.composio.dev/docs/cli](https://docs.composio.dev/docs/cli)
