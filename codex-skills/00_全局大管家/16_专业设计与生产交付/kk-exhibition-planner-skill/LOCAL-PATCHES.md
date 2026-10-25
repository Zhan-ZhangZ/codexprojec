# Local Integration Notes

## 2026-10-25

- Upstream: <https://github.com/sunzhaokai95/kk-exhibition-planner-skill>
- Upstream commit: `7fa921cf79182812559f984728a61ff83ad26722`
- Preserved the upstream top-level `SKILL.md`, including its `name`, `description`, workflow, and author text.
- Preserved the three project-type references, outline template, concept-deck flows, local brief-form generator, English README, and MIT license.
- Upstream already provided a Chinese README; reused that text as `README.zh-CN.md` and updated the English README language link. No English-to-Chinese translation was added.
- Removed the anonymized showcase folder, the contribution guide, the duplicate legacy English README, and repository ignore metadata. README links to removed material now point to the fixed upstream commit.
- Known upstream usage detail: the form generator requires a project type argument. Invoke it as `python3 scripts/generate_brief_form.py <a|b|c> [output_dir]`.
