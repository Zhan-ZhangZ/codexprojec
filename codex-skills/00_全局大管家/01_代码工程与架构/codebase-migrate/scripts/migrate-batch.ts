// migrate-batch.ts — Codebase migration batch helper
// Run per batch via: composio run --file scripts/migrate-batch.ts -- --batch 3
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
