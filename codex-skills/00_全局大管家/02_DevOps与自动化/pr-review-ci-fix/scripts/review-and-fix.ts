// review-and-fix.ts — PR review + CI auto-fix one-shot
// Run with: composio run --file ./scripts/review-and-fix.ts -- --pr 482
const pr = process.argv.includes("--pr")
  ? Number(process.argv[process.argv.indexOf("--pr") + 1])
  : null;

const meta = await execute("GITHUB_GET_A_PULL_REQUEST", {
  owner: "acme", repo: "app", pull_number: pr
});
const files = await execute("GITHUB_LIST_PULL_REQUESTS_FILES", {
  owner: "acme", repo: "app", pull_number: pr
});

console.log(JSON.stringify({ meta, files }, null, 2));
