// sentry-diag.ts — Sentry issue diagnosis
// Run with: composio run --file scripts/sentry-diag.ts -- --id PROJ-1F4
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
