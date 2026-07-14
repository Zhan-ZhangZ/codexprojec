---
name: deploy-pipeline
description: 端到端跨平台部署流水线大管家。深度集成 Composio CLI，一键拉起跨 Stripe、Supabase 和 Vercel 的协同发布：同步推送 Stripe 产品配置、执行 Supabase 数据库迁移、发布 Vercel 静态/SSR 资源，并执行自动化部署后校验（Post-deploy checks）。Leading Words: 端到端部署, CI/CD流水线, Stripe配置同步, Supabase数据迁移, Vercel发布
metadata:
  short-description: Stripe/Supabase/Vercel deploy pipelines
---

# Deploy Pipeline (Stripe / Supabase / Vercel)

> ## ⚙️ 前置依赖（本技能包不含，需客户自行安装与授权）
>
> 本技能依赖 **Composio CLI**（独立的 SaaS 命令行客户端），无法随技能包预置，使用前需由客户自行安装并登录授权：
>
> ```bash
> curl -fsSL https://composio.dev/install | bash   # 安装 CLI
> composio login                                    # 登录（打开浏览器）
> composio link stripe && composio link supabase && composio link vercel
> ```
>
> 首次使用前请先完成安装与授权，否则 agent 执行 `composio` 命令会报错。详见下文「Prereqs」与官方文档 [docs.composio.dev/docs/cli](https://docs.composio.dev/docs/cli)。

Coordinate staged releases across Stripe, Supabase, and Vercel from the shell using the [Composio CLI](https://docs.composio.dev/docs/cli). One script kicks off the whole "ship it" sequence: product/price updates, DB migrations, frontend deploy, smoke checks, changelog post.

## When to Use

- Full-stack product launch that touches billing, database, and frontend together.
- Promoting a preview Vercel build to production with a Stripe price flip and a Supabase migration.
- Weekly release trains where the same sequence repeats and you want it reliable.

## Prereqs

```bash
curl -fsSL https://composio.dev/install | bash
composio login
composio link stripe
composio link supabase
composio link vercel
composio link slack        # for release announcements
```

## Discover Tools

```bash
composio search "create price" --toolkits stripe
composio search "apply migration" --toolkits supabase
composio search "create deployment" --toolkits vercel
composio tools list stripe
composio tools list supabase
composio tools list vercel
```

Common slugs (verify with `--get-schema`):

**Stripe**
- `STRIPE_CREATE_PRODUCT`
- `STRIPE_CREATE_PRICE`
- `STRIPE_UPDATE_PRODUCT`
- `STRIPE_LIST_PRICES`

**Supabase**
- `SUPABASE_LIST_PROJECTS`
- `SUPABASE_RUN_SQL_QUERY`
- `SUPABASE_LIST_MIGRATIONS`
- `SUPABASE_APPLY_MIGRATION`

**Vercel**
- `VERCEL_CREATE_A_NEW_DEPLOYMENT`
- `VERCEL_GET_A_DEPLOYMENT_BY_ID_OR_URL`
- `VERCEL_LIST_DEPLOYMENTS`
- `VERCEL_PROMOTE_DEPLOYMENT`

## The Pipeline

The order matters: **Stripe → Supabase → Vercel → Verify → Announce.** Billing changes before DB, DB before frontend.

### 1. Stripe: Create or Update the Price

```bash
composio execute STRIPE_CREATE_PRICE -d '{
  "product":"prod_abc123",
  "unit_amount":2900,
  "currency":"usd",
  "recurring":{"interval":"month"},
  "lookup_key":"team-plan-v2"
}'
```

### 2. Supabase: Apply Migrations

```bash
composio execute SUPABASE_APPLY_MIGRATION -d '{
  "project_id":"abcxyz",
  "name":"add_team_tier_column",
  "query":"alter table teams add column tier text default '\''free'\'';"
}'
```

Sanity-check the schema after:

```bash
composio execute SUPABASE_RUN_SQL_QUERY -d '{
  "project_id":"abcxyz",
  "query":"select column_name from information_schema.columns where table_name='\''teams'\'' and column_name='\''tier'\'';"
}'
```

### 3. Vercel: Deploy + Promote

```bash
# Trigger a production deployment from a git ref
composio execute VERCEL_CREATE_A_NEW_DEPLOYMENT -d '{
  "name":"web",
  "target":"production",
  "gitSource":{"type":"github","ref":"main","repoId":123456}
}'
```

Poll until ready:

```bash
composio execute VERCEL_GET_A_DEPLOYMENT_BY_ID_OR_URL -d '{"idOrUrl":"dpl_xxx"}' \
  | jq '.readyState'
```

### 4. Verify

```bash
curl -fsS https://app.acme.com/api/health
composio execute SUPABASE_RUN_SQL_QUERY -d '{
  "project_id":"abcxyz","query":"select count(*) from teams where tier is null;"
}'
```

### 5. Announce

```bash
composio execute SLACK_SEND_MESSAGE -d '{
  "channel":"releases",
  "text":"✅ Team Plan v2 shipped. Stripe price `team-plan-v2` live, Supabase migration applied, Vercel production promoted."
}'
```

## Pipeline as a Workflow File

`scripts/ship.ts`, run with `composio run --file scripts/ship.ts -- --ref main`:

```ts
const ref = process.argv[process.argv.indexOf("--ref") + 1] ?? "main";

// 1. Stripe
const price = await execute("STRIPE_CREATE_PRICE", {
  product: "prod_abc123", unit_amount: 2900, currency: "usd",
  recurring: { interval: "month" }, lookup_key: "team-plan-v2"
});

// 2. Supabase
await execute("SUPABASE_APPLY_MIGRATION", {
  project_id: "abcxyz",
  name: "add_team_tier_column",
  query: "alter table teams add column tier text default 'free';"
});

// 3. Vercel
const dep = await execute("VERCEL_CREATE_A_NEW_DEPLOYMENT", {
  name: "web", target: "production",
  gitSource: { type: "github", ref, repoId: 123456 }
});

// 4. Wait for ready
let state = "QUEUED";
while (state !== "READY" && state !== "ERROR") {
  await new Promise(r => setTimeout(r, 4000));
  const d = await execute("VERCEL_GET_A_DEPLOYMENT_BY_ID_OR_URL", { idOrUrl: dep.id });
  state = d.readyState;
}

if (state !== "READY") throw new Error("Vercel deploy failed");

// 5. Announce
await execute("SLACK_SEND_MESSAGE", {
  channel: "releases",
  text: `✅ Shipped ${ref}. Stripe price ${price.id}, Vercel ${dep.url}.`
});
```

## Rollback Plan

If verification fails, undo in **reverse order**:

1. Vercel: `VERCEL_PROMOTE_DEPLOYMENT` to the previous deployment ID.
2. Supabase: apply the down migration (always write the paired `down.sql` before shipping).
3. Stripe: `STRIPE_UPDATE_PRODUCT` to hide the new price (`active:false`); do **not** delete — Stripe objects are immutable in practice and affect historical invoices.
4. Slack: announce the rollback.

## Troubleshooting

- **Stripe price visible but checkout still shows old one** → cache on your app side; confirm `lookup_key` is what checkout fetches.
- **Supabase migration hangs** → another connection holds a lock; run `select pid, state, query from pg_stat_activity where state <> 'idle';`.
- **Vercel deploy stuck in `QUEUED`** → check build logs via `VERCEL_GET_A_DEPLOYMENT_BY_ID_OR_URL` with `?logs=1`.
- **Ordering bug** (frontend reads a column before migration applies) → always serialize the pipeline; never `--parallel` across Stripe/Supabase/Vercel.

Full CLI reference: [docs.composio.dev/docs/cli](https://docs.composio.dev/docs/cli)
