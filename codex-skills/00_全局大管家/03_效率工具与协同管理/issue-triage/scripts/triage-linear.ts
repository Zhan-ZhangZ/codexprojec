// triage-linear.ts — Linear backlog triage
// Run with: composio run --file scripts/triage-linear.ts
const { nodes: issues } = await execute("LINEAR_LIST_ISSUES", {
  filter: { state: { type: { eq: "unstarted" } }, assignee: { null: true } },
  first: 100
});

const stale = issues.filter(i => {
  const age = (Date.now() - new Date(i.updatedAt).getTime()) / 86400000;
  return age > 14;
});

for (const i of stale) {
  await execute("LINEAR_CREATE_COMMENT", {
    issueId: i.id,
    body: "Auto-triage: stale for 14+ days. Please assign or close."
  });
}

await execute("SLACK_SEND_MESSAGE", {
  channel: "triage",
  text: `Weekly triage: pinged ${stale.length} stale issues.`
});
