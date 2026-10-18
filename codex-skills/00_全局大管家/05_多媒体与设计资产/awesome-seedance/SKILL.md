---
name: awesome-seedance
description: "Seedance 2.5/2.0 视频提示词证据库与类型化技能集。600+ 溯源案例、260+ 跨模型复测结论、25 套即抄即用模板，内嵌 15 个类型子技能（提示词库/制作流程/梗图喜剧/史诗奇幻/美食ASMR/恐怖悬疑/时尚Lookbook/分镜转视频等），自 goodcase.ai 人审案例蒸馏。Leading Words: Seedance提示词库, 视频生成模板, 即梦视频案例, 分镜转视频, 复测结论"
metadata:
  upstream: github.com/LearnPrompt/awesome-seedance
---

# Awesome Seedance 🎬

An evidence-led prompt library and skill collection for Seedance 2.5 / 2.0
(即梦视频) AI video generation. Templates are distilled from human-verified,
high-heat cases on [goodcase.ai](https://goodcase.ai); every case is traced to
its original post and many carry cross-model retest verdicts.

- **Upstream**: https://github.com/LearnPrompt/awesome-seedance (MIT)
- **Layout**: fifteen self-contained sub-skills under `agents/skills/`, each
  with its own `SKILL.md` and `references/`. Read the matching sub-skill's
  `SKILL.md` before writing a prompt; do not invent structure from general
  video-generation knowledge when a template exists.

## Sub-Skills

| Skill | Entry | Use when the task involves... |
| --- | --- | --- |
| Prompt Library | `agents/skills/seedance-prompt-library/SKILL.md` | Any Seedance prompt writing/review; template lookup by shot intent (start here). |
| Production Workflow | `agents/skills/seedance-production-workflow/SKILL.md` | End-to-end brief → references → storyboard → handoff → shot-level QA. |
| Meme & Comedy | `agents/skills/seedance-meme-comedy/SKILL.md` | Skits where every beat serves one visible punchline. |
| Epic Fantasy / Sci-Fi | `agents/skills/seedance-epic-fantasy-scifi/SKILL.md` | Monsters, dragons, world reveals with per-entity definition blocks. |
| Food ASMR | `agents/skills/seedance-food-asmr/SKILL.md` | Cooking close-ups, mukbang, eating vlogs with visible food change per beat. |
| Horror & Suspense | `agents/skills/seedance-horror-suspense/SKILL.md` | Timecoded dread chains; one visible body change per shot. |
| 3D Cartoon | `agents/skills/seedance-3d-cartoon/SKILL.md` | One anthropomorphic character carrying the whole film. |
| Car & Vehicle | `agents/skills/seedance-car-vehicle/SKILL.md` | Vehicle locked part-by-part while the camera does the work. |
| Fashion Lookbook | `agents/skills/seedance-fashion-lookbook/SKILL.md` | One person, one look, head-to-toe appearance lock across scenes. |
| Pet & Animal | `agents/skills/seedance-pet-animal/SKILL.md` | Animal leads shot on a phone; exactly-one count locks. |
| Retro DV / Home Video | `agents/skills/seedance-retro-dv-home-video/SKILL.md` | Camcorder-defect period feel around one tiny incident. |
| Sports & Extreme | `agents/skills/seedance-sports-extreme/SKILL.md` | Action loops from run-up to landing with named physics. |
| Game UI / Livestream | `agents/skills/seedance-game-ui-livestream/SKILL.md` | The screen itself is the shot: fake gameplay, streams, desktop capture. |
| Storyboard Grid → Video | `agents/skills/seedance-storyboard-grid-to-video/SKILL.md` | Numbered panel sheet first, then feed the sheet to Seedance. |
| Travel City Walk | `agents/skills/seedance-travel-city-walk/SKILL.md` | One traveller, scene-by-scene timecodes and locations. |

## Supporting Material

- `README.md` / `README_zh.md` / `README_ja.md` — curated case showcase with
  heat scores, stability ratings and retest verdicts (EN / 中文 / 日本語).
- `docs/templates/en|zh/` — 27 copy-ready prompt templates per language; each
  is a fill-in-the-brackets block usable in any AI chat.
- `data/cases.json` — the full structured case library (843 cases with prompts,
  sources, heat and retest data) for grep/JSON querying; `data/style-library.json`
  and `data/templates-local.json` hold the distilled template sources.
- `data/site-skills.json` — catalog of all 65 video skills on goodcase.ai
  (15 of them vendored here under `agents/skills/`).

## Failure Handling

- A template does not fit the request: fall back to
  `agents/skills/seedance-prompt-library/references/style-library.md` and pick
  the closest `useWhen`; ask the user only if intent is genuinely ambiguous.
- Case links (goodcase.ai / X) fail: the prompt text in `data/cases.json`
  remains usable; note the dead source and continue.
- Upstream regenerates README/gallery daily from `data/`; treat `data/` as the
  source of truth when text differs.
