---
name: meeting-notes-and-actions
description: 标准化会议纪要与行动项（Action Items）提炼器。将 Zoom/Teams 长语音转文字稿浓缩为结构化的大纲，精准圈出最终决议（Decisions）、风险预警（Risks）及绑定到特定负责人的执行项。Leading Words: 会议纪要浓缩, Action Items提取, 风险决策捕获, 结构化会议提要
metadata:
  short-description: Meeting transcript to notes and actions
---

# Meeting Notes & Actions

Process transcripts into structured notes and action items.

## Inputs to ask for
- Source: pasted transcript/text or file path; meeting title/date; attendees and their handles.
- Output style: terse bullets vs. narrative, action-item format, due date/owner tags, redaction rules if any.

## Workflow
1) Normalize text: strip timestamps/speaker labels if noisy; lightly clean filler words; keep quoted statements intact.
2) Extract essentials: agenda topics, key decisions, open questions, risks/blocked items.
3) Action items: who/what/when. Convert vague asks into concrete tasks; propose due dates if missing.
4) Produce output:
   - Header with meeting title, date, attendees.
   - Sections: `Summary`, `Decisions`, `Open Questions/Risks`, `Action Items` (checkboxes with owner + due).
5) Quality checks: ensure names are consistent; no hallucinated facts; flag ambiguities as clarifying questions.

## Optional extras
- Include timeline of major moments if timestamps exist.
- Provide short Slack/Email-ready blurb (2–3 sentences) plus the full notes.
