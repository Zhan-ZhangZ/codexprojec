---
name: gathered-scenes-zine-skill
description: "拾景纸刊生图技能集（4
  个子技能）。把用户提供的普通照片先「阅读现场」（辨认主体、空间、色彩、动作与未说完的情绪），再选择保留真实现场（实景拼贴）或把现场蒸馏为纸上作品（影像蒸馏\
  ），生成 3:5 竖版、撕纸边界、留白呼吸的纸刊海报；并含莫兰迪电影感海报与 Apple 实况照片（Live
  Photo）动态纸刊两条扩展路径。Leading Words: 拾景纸刊, 实景拼贴海报, 影像蒸馏, 撕纸边界, 纸刊zine生成, 照片转海报,
  莫兰迪电影海报, 实况照片纸刊"
metadata:
  upstream: github.com/Zeejay0/gathered-scenes-zine-skill
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# gathered-scenes-zine-skill

拾景纸刊生图技能集（4 个子技能）。把用户提供的普通照片先「阅读现场」（辨认主体、空间、色彩、动作与未说完的情绪），再选择保留真实现场（实景拼贴）或把现场蒸馏为纸上作品（影像蒸馏），生成 3:5 竖版、撕纸边界、留白呼吸的纸刊海报；并含莫兰迪电影感海报与 Apple 实况照片（Live Photo）动态纸刊两条扩展路径。

## 何时使用

适用任务：拾景纸刊生图技能集（4 个子技能）。把用户提供的普通照片先「阅读现场」（辨认主体、空间、色彩、动作与未说完的情绪），再选择保留真实现场（实景拼贴）或把现场蒸馏为纸上作品（影像蒸馏），生成 3:5 竖版、撕纸边界、留白呼吸的纸刊海报；并含莫兰迪电影感海报与 Apple 实况照片（Live Photo）动态纸刊两条扩展路径。
相关检索词：拾景纸刊、Gathered Scenes Zine、Zeejay纸刊、实景拼贴、影像蒸馏、image-generation、zine、poster、photo-collage、paper-texture、chinese。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `skills/morandi-cinematic-poster-zeejay/SKILL.md` — **morandi-cinematic-poster-zeejay**：Transform a user-supplied personal photograph into a source-faithful, typography-driven Morandi cinematic poster without stars or decorative collage symbols. Use film-poster title design, optional poetic byline and tagl…
- `skills/scene-distillation-zine-v1-3/SKILL.md` — **scene-distillation-zine-v1-3**：Transform a user-supplied photo into an expressive minimal zine poster made only from original source-derived illustration, an artistic proposition, emotional tension, visual metaphor, spacious negative space, art-direc…
- `skills/scenes-gathered-zine-live-flow-v1-0/SKILL.md` — **scenes-gathered-zine-live-flow-v1-0**：Run the complete Gathered Scenes workflow from a supplied photograph to a static poster, a scene-authored adaptive v0.2 flat paper-tear Apple Live Photo ZIP, and optional handoff of that ZIP to the local Live Photo Impo…
- `skills/scenes-gathered-zine-v1-3/SKILL.md` — **scenes-gathered-zine-v1-3**：Transform a user-supplied photo into a vertical 3:5 Gathered Scenes Zine poster that anchors truthful photography inside a spacious source-derived abstract illustration field, aggressively compresses dense foliage and o…

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `README.en.md`

## 上游

- https://github.com/Zeejay0/gathered-scenes-zine-skill
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
