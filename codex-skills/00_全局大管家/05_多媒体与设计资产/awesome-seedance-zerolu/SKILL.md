---
name: awesome-seedance-zerolu
description: "Seedance 2.0 高保真提示词精选合集（ZeroLu 版）。电影级运镜、广告商业、UGC 口播、动漫、短剧、视觉特效等七大类实战提示词与 Seedance API 接入指南，附九大商用玩法中文拆解，六语言版本。与 LearnPrompt 证据库互补，偏风格配方速查。Leading Words: Seedance 2.0提示词, 电影级视频提示词, Seedance API指南, 商用玩法, 视频风格配方"
metadata:
  upstream: github.com/ZeroLu/awesome-seedance
---

# Awesome Seedance 2.0 (ZeroLu) 🎬

A curated prompt collection for Seedance 2.0 AI video generation, sourced from
X (Twitter), WeChat and top prompt engineers. Treat it as a style-recipe
quick-reference: locate the category, copy the prompt block, replace the
bracketed specifics, and adapt duration/shot split to the target clip.

- **Upstream**: https://github.com/ZeroLu/awesome-seedance (MIT)
- **Language pick**: `README.md` (EN) or `README-zh.md` (中文)；ja/de/fr/es
  variants mirror the same content. Sections are numbered identically across
  languages, so a case found in one can be located in the other by number.

## Applicable Tasks

- Writing or revising a Seedance 2.0 video prompt for a specific style
  (cinematic race scene, brand ad, UGC talk-to-camera, anime, meme).
- Choosing a visual style/category for a video idea before prompting.
- Wiring Seedance generation into code via API (section 8: Resources).

## How to Use

1. Match the request to one of the seven prompt categories:
   ① Cinematic Film Styles ② Advertising & Commercial Branding
   ③ Social Media & Viral Memes ④ UGC Style ⑤ Anime & Animation
   ⑥ Short-form Drama & Web Series ⑦ Visual Effects & Experimental.
2. Open that section in `README-zh.md` (or `README.md`), pick the closest
   case, and copy its fenced prompt block.
3. Replace the bracketed/placeheld parts with the user's subject, product or
   scene; keep the timecode structure (`[00-05s] Shot 1: ...`) — Seedance 2.0
   prompts are multi-shot scripts with dialogue cues.
4. For business scenarios (trending parody, brand ad, try-on, live-commerce,
   dynamic poster, ad remake, live-action skit, AI comic drama), consult
   `prompts/commercial-use-cases.md`（卡尔的AI沃茨九大商用玩法中文拆解）.

## Failure Handling

- No case matches: combine the closest category's shot structure with the
  subject description; keep duration + timecodes + one visual change per shot.
- External links (X posts, API docs) may rot; the prompt text itself remains
  usable — note the dead source and continue.
- The "Last updated on" line is a frozen snapshot timestamp from upstream CI.

## Reference Files

- `README.md` / `README-zh.md` — main prompt library (sections 1–7 + API resources).
- `prompts/commercial-use-cases.md` — 9 commercial playbooks (中文).
- Sister skill `awesome-seedance` (LearnPrompt) in this library offers
  evidence-graded templates and 15 genre sub-skills for deeper work.
