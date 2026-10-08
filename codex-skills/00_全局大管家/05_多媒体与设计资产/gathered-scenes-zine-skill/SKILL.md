---
name: gathered-scenes-zine-skill
description: 拾景纸刊生图技能集（4 个子技能）。把用户提供的普通照片先「阅读现场」（辨认主体、空间、色彩、动作与未说完的情绪），再选择保留真实现场（实景拼贴）或把现场蒸馏为纸上作品（影像蒸馏），生成 3:5 竖版、撕纸边界、留白呼吸的纸刊海报；并含莫兰迪电影感海报与 Apple 实况照片（Live Photo）动态纸刊两条扩展路径。Leading Words: 拾景纸刊, 实景拼贴海报, 影像蒸馏, 撕纸边界, 纸刊zine生成, 照片转海报, 莫兰迪电影海报, 实况照片纸刊
metadata:
  upstream: "github.com/Zeejay0/gathered-scenes-zine-skill"
---

# 拾景纸刊 · Gathered Scenes Zine（技能集路由）

**上游仓库**：<https://github.com/Zeejay0/gathered-scenes-zine-skill>

一套为生图 Agent 编写的「照片→纸刊海报」视觉语言：真景为锚、插画成场、色彩成结构、撕纸成界、纸面会呼吸。根据用户诉求路由到对应子技能（每个子技能有独立 `SKILL.md`，按需加载）：

| 子技能目录 | 路径 | 用途 |
| --- | --- | --- |
| **实景拼贴 v1.3** | [skills/scenes-gathered-zine-v1-3/SKILL.md](skills/scenes-gathered-zine-v1-3/SKILL.md) | 默认路径：保留真实摄影场景为锚，抽象插画场重述选定的源元素，高纯度单色作构图结构，手撕纤维边界的 3:5 竖版海报 |
| **影像蒸馏 v1.3** | [skills/scene-distillation-zine-v1-3/SKILL.md](skills/scene-distillation-zine-v1-3/SKILL.md) | 舍弃照片本身，把现场蒸馏为一件新的纸上作品（动作、轮廓、情绪的图形化提炼） |
| **莫兰迪电影感海报** | [skills/morandi-cinematic-poster-zeejay/SKILL.md](skills/morandi-cinematic-poster-zeejay/SKILL.md) | 莫兰迪低饱和电影感海报，附排版参考素材（assets/reference-typography-material-v1.png） |
| **实况照片纸刊 v1.0** | [skills/scenes-gathered-zine-live-flow-v1-0/SKILL.md](skills/scenes-gathered-zine-live-flow-v1-0/SKILL.md) | Apple 实况照片（Live Photo）动态纸刊：自适应撕边渲染 + 导入器 .app + Swift/Python 脚本，内嵌静态海报 v1.9 参考实现 |

## 使用说明

- 详细创作理念与两种创作路径见 [README.md](README.md)（英文版 [README.en.md](README.en.md)）。
- 上游示例图与品牌素材未随集成保留，README 中的示例图已改写为指向上游仓库的绝对链接。

## 集成说明（本库维护）

- 集成日期：2026-10-08；上游 HEAD：`b9edb83`（2026-09-03）。
- 瘦身剔除：`assets/brand/`（2.8M README 推广/品牌配图）、`examples/`（3.4M 展示样例 source/result 对照图集）——均为展示样例，缺失不影响技能调用执行；README 内对应引用已改写为上游绝对 URL。
- 保留 `skills/` 全量运行链路（含实况照片导入器 .app、Swift/Python 脚本、嵌套 static-poster v1.9 参考实现）。
