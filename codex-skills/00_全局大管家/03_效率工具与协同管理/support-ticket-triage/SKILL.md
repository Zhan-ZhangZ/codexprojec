---
name: support-ticket-triage
description: 全渠道客服工单智能分类与自动化回复分诊台。处理 Zendesk、Intercom 等导出的原始报文，进行意图分类、定级（Priority），并起草包含复现步骤的标准话术回复。Leading Words: Zendesk工单分诊, 客服报文分类, Intercom优先级定级, 标准化话术起草
metadata:
  short-description: Categorize and respond to support tickets
---

# Support Ticket Triage

Standardize how to classify and respond to incoming tickets.

## Inputs to gather
- Ticket text (include attachments/links), product area, customer plan/tier if known.
- Desired outputs: category taxonomy, priority levels, SLA hints, tone/brand voice, whether to draft a reply.

## Workflow
1) Parse context: identify issue type, product surface, severity, customer impact, reproduction hints, and blockers.
2) Categorize: assign category and subcategory; set priority (e.g., P0–P3) with short justification.
3) Draft response (if asked): concise acknowledgment, empathy, restate issue, next steps, and ask for missing info; include reproduction checklist when uncertain.
4) Internal notes: suspected root cause, logs to pull, teams to loop, and tracking IDs to create/attach.
5) Output: tabular or bullet summary with `Category`, `Priority`, `Summary`, `Proposed Fix/Next Steps`, `Reply Draft`.

## Quality checks
- Avoid promises; give ranges not exact ETAs unless provided.
- Mask PII if copying to public channels.
- If signal is weak, present 2–3 likely categories and what evidence would disambiguate.
