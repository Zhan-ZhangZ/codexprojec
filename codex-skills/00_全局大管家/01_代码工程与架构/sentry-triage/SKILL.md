---
name: sentry-triage
description: Sentry 线上错误实时诊断与修复助手。免去了人工复制堆栈的繁琐，利用 Composio CLI 直连 Sentry 获取异常明细、用户行为面包屑（Breadcrumbs）及嫌疑 Commit，自动将报错调用栈映射到本地源码，并输出热修复（Hotfix）方案。Leading Words: Sentry错误日志分析, 线上异常诊断, 调用栈映射, 自动Hotfix定位, 行为面包屑排查
metadata:
  short-description: Sentry error diagnosis via the Composio CLI
---

# Sentry Triage

> ## ⚙️ 前置依赖（本技能包不含，需客户自行安装与授权）
>
> 本技能依赖 **Composio CLI**（独立的 SaaS 命令行客户端），无法随技能包预置，使用前需由客户自行安装并登录授权：
>
> ```bash
> curl -fsSL https://composio.dev/install | bash   # 安装 CLI
> composio login                                    # 登录（打开浏览器）
> composio link sentry                              # 连接 Sentry
> ```
>
> 首次使用前请先完成安装与授权，否则 agent 执行 `composio` 命令会报错。详见下文「Prereqs」与官方文档 [docs.composio.dev/docs/cli](https://docs.composio.dev/docs/cli)。

Pull Sentry issues, events, and suspect commits straight into the agent via the [Composio CLI](https://docs.composio.dev/docs/cli). Skip the copy-paste-stack-trace dance.

## When to Use

- New Sentry alert and you want the agent to investigate, not just quote the subject line.
- Diagnosing a regression: find the releases, suspect commit, and affected files.
- Building a "top 10 unresolved issues" digest with reproduction hints.

## Prereqs

```bash
curl -fsSL https://composio.dev/install | bash
composio login
composio link sentry        # auth token with event:read + project:read
```

## Discover Tools

```bash
composio search "get sentry issue" --toolkits sentry
composio search "list events for issue" --toolkits sentry
composio tools list sentry
```

Common slugs (verify with `--get-schema`):

- `SENTRY_GET_AN_ISSUE`
- `SENTRY_LIST_AN_ISSUES_EVENTS`
- `SENTRY_RETRIEVE_AN_EVENT_FOR_A_PROJECT`
- `SENTRY_LIST_A_PROJECTS_ISSUES`
- `SENTRY_UPDATE_AN_ISSUE`

## Diagnose a Single Issue

1. **Fetch the issue** (by short ID like `PROJ-1F4` or numeric ID):
   ```bash
   composio execute SENTRY_GET_AN_ISSUE -d '{"issue_id":"PROJ-1F4"}'
   ```
2. **Grab the latest event** with full stack + breadcrumbs:
   ```bash
   composio execute SENTRY_LIST_AN_ISSUES_EVENTS \
     -d '{"issue_id":"PROJ-1F4","full":true,"limit":1}'
   ```
3. **Map each frame to local source.** For each `filename` + `lineno` in the stack, the agent opens the file and reads ±20 lines. No manual copy-paste.
4. **Check suspect commits** (Sentry attaches these when release tracking is set up) — open them with `git show <sha>` locally.
5. **Propose a fix** with a diff, run tests, and — once green — mark the issue resolved:
   ```bash
   composio execute SENTRY_UPDATE_AN_ISSUE \
     -d '{"issue_id":"PROJ-1F4","status":"resolved","statusDetails":{"inNextRelease":true}}'
   ```

## Triage a Batch

```bash
composio execute SENTRY_LIST_A_PROJECTS_ISSUES -d '{
  "organization_slug":"acme",
  "project_slug":"api",
  "query":"is:unresolved age:-24h",
  "sort":"freq",
  "limit":20
}'
```

Pipe into `jq` for a ranked summary:

```bash
composio execute SENTRY_LIST_A_PROJECTS_ISSUES -d '{"organization_slug":"acme","project_slug":"api","query":"is:unresolved"}' \
  | jq -r '.[] | "\(.count)\t\(.shortId)\t\(.title)"' | sort -rn | head
```

## Workflow File

`scripts/sentry-diag.ts`, run with `composio run --file scripts/sentry-diag.ts -- --id PROJ-1F4`:

```ts
const id = process.argv[process.argv.indexOf("--id") + 1];

const issue = await execute("SENTRY_GET_AN_ISSUE", { issue_id: id });
const [event] = await execute("SENTRY_LIST_AN_ISSUES_EVENTS", {
  issue_id: id, full: true, limit: 1
});

const frames = (event?.entries ?? [])
  .filter(e => e.type === "exception")
  .flatMap(e => e.data.values.flatMap(v => v.stacktrace?.frames ?? []))
  .filter(f => f.inApp)
  .map(f => ({ file: f.filename, line: f.lineno, fn: f.function }));

console.log(JSON.stringify({ title: issue.title, culprit: issue.culprit, frames }, null, 2));
```

The agent then reads each `file` at `line ± 20` and drafts a patch.

## Route to Linear / Slack

Chain tools to open a ticket for the top unresolved issue:

```bash
composio run '
  const [top] = await execute("SENTRY_LIST_A_PROJECTS_ISSUES", {
    organization_slug: "acme", project_slug: "api",
    query: "is:unresolved", sort: "freq", limit: 1
  });
  await execute("LINEAR_CREATE_ISSUE", {
    teamId: "TEAM_ID",
    title: `[Sentry] ${top.title}`,
    description: `Short ID: ${top.shortId}\nPermalink: ${top.permalink}\nCount: ${top.count}`
  });
'
```

## Troubleshooting

- **`404 on issue_id`** → use the short ID (`PROJ-1F4`), not the URL slug.
- **Empty events** → the issue was resolved/archived; query with `query:"is:resolved"` or bump `limit`.
- **Missing suspect commit** → release tracking isn't configured in Sentry; set up `sentry-cli releases` in CI.
- **No `inApp` frames** → source maps not uploaded; stack will only show vendor code.

Full CLI reference: [docs.composio.dev/docs/cli](https://docs.composio.dev/docs/cli)
