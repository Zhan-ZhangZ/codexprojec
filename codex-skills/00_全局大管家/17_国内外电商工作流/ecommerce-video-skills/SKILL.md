---
name: ecommerce-video-skills
description: "由 13 个可独立调用的 Agent Skills 组成的电商短视频生产集合。用于从商品图和卖点生成 3 秒钩子、分镜脚本、图生视频提示词、口播配音、字幕花字、FFmpeg 自动成片、平台规格导出、直播切片、多语言配音和封面 A/B；支持抖音、TikTok Shop、视频号、小红书、淘宝主图视频与 Amazon。触发词：电商短视频、带货视频 Skill、商品图转视频、3 秒钩子、卖点分镜、edge-tts 配音、FFmpeg 自动成片、TikTok Shop 导出。"
metadata:
  upstream: https://github.com/xianyu110/ecommerce-video-skills
  commit: 96c49b349b7d975bda8f05ce6669c1d33500c269
---

# 电商短视频 Agent Skills

这是中文优先的 13 技能集合。先按用户当前缺失的环节选一个子技能；需要完整成片时，再按“钩子 → 分镜 → 可选图生视频 → 配音 → 字幕 → FFmpeg → 平台导出 → 封面”组合。

## 路由表

| 用户任务 | 子技能入口 |
|---|---|
| 写前 3 秒钩子、开场台词和花字 | [hook-3s-script](skills/hook-3s-script/SKILL.md) |
| 把卖点拆成 15–60 秒逐镜分镜 | [selling-point-storyboard](skills/selling-point-storyboard/SKILL.md) |
| 商品图转图生视频镜头提示词 | [image-to-video-shots](skills/image-to-video-shots/SKILL.md) |
| 适配 Seedance、可灵、Veo、Runway、海螺、万相等模型 | [multi-model-shot-prompts](skills/multi-model-shot-prompts/SKILL.md) |
| 拆解、改写并复刻爆款带货结构 | [viral-remake](skills/viral-remake/SKILL.md) |
| 逐句生成口播和旁白 | [ai-voiceover-edge-tts](skills/ai-voiceover-edge-tts/SKILL.md) |
| 生成字幕、花字和安全区排版 | [subtitles-and-text-effects](skills/subtitles-and-text-effects/SKILL.md) |
| 用 storyboard.json 本地自动成片 | [ffmpeg-auto-assemble](skills/ffmpeg-auto-assemble/SKILL.md) |
| 导出抖音、TikTok Shop、小红书等规格 | [platform-spec-export](skills/platform-spec-export/SKILL.md) |
| 从直播录屏批量选段并导出切片 | [live-stream-clips](skills/live-stream-clips/SKILL.md) |
| 生成开箱、横评和对比评测脚本 | [unboxing-comparison-review](skills/unboxing-comparison-review/SKILL.md) |
| 同一分镜生成多语言本地化版本 | [multilingual-dubbing](skills/multilingual-dubbing/SKILL.md) |
| 生成封面、标题和多版 A/B 测试素材 | [cover-title-ab](skills/cover-title-ab/SKILL.md) |

## 最短执行路径

1. 准备商品图、商品事实、目标平台、语言和时长。
2. 读取 [README.md](README.md) 确认依赖：Python 3、`pillow`、`numpy`、`edge-tts`，以及带 libass 的 FFmpeg。
3. 先用钩子或卖点分镜形成 `storyboard.json`。
4. 可用本地 Ken Burns 兜底；只有用户明确选择时才调用图生视频模型。
5. 运行 TTS、字幕和 FFmpeg 合成，再导出目标平台版本和封面。
6. 检查商品一致性、字幕安全区、响度、时长和平台规格后交付。

## 关键边界

- 商品事实、价格、优惠、评价和功效不得编造；广告法绝对化用语和未验证数据先拦截。
- 图生视频提示词必须先锁定商品形状、颜色、Logo 与关键结构，商品漂移时拒绝该镜头。
- Edge TTS 是联网服务；离线场景需改用本机已有音频或其他 TTS，不修改脚本冒充离线。
- 直播切片需确认用户拥有录屏、肖像、声音、商标与素材使用权。
- 不要整目录一次加载 13 个子技能；按当前任务读取最小必要入口和参考文件。

完整示例、平台说明和安装方式以 [README.md](README.md) 为准。本地集成与裁剪记录见 [LOCAL-PATCHES.md](LOCAL-PATCHES.md)。
