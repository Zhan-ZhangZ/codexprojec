// dd-incident.ts — Datadog incident log sweep
// Run with: composio run --file scripts/dd-incident.ts -- --service checkout
const svc = process.argv[process.argv.indexOf("--service") + 1];

const errors = await execute("DATADOG_SEARCH_LOGS", {
  filter: { query: `service:${svc} status:error`, from: "now-1h", to: "now" },
  page: { limit: 200 }, sort: "-timestamp"
});

const topPaths = await execute("DATADOG_AGGREGATE_LOGS", {
  filter: { query: `service:${svc} status:error`, from: "now-1h", to: "now" },
  group_by: [{ facet: "@http.url_path", limit: 10 }],
  compute: [{ aggregation: "count" }]
});

console.log(JSON.stringify({ svc, sample: errors.data?.slice(0,5), topPaths }, null, 2));
