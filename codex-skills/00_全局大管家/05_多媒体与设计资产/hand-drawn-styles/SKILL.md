---
name: hand-drawn-styles
description: "工具无关的手绘画风提示词配方。内置 19 种已验证手绘画风（含 2 个变体共 21 套配方），把内容套进内置画风配方产出可直接复制的生图 prompt。Leading Words: 手绘画风提示词配方, 儿童涂色极简线条蜡笔, 吉卜力小豆人涂鸦, 工具无关生图prompt"
---

# 手绘风格 prompt 生成器

完整指令与画风配方是工具无关的,放在同目录:

1. 按 [PROTOCOL.md](PROTOCOL.md) 的 5 步流程执行:确定画风 → 取配方 → 自动填占位符 → 处理比例 → 输出 prompt。
2. 从 [STYLES.md](STYLES.md) 取对应编号的完整模板。画风编号已随上游 2026-08-04 改版重排:现行为整数编号 1–18,另含稳定变体 3.1;旧 1 与 1.1(儿童涂色组)已删除,旧 2–19 整体前移一位。
3. 能执行脚本时优先调用 `scripts/render_prompt.py`,不得手工缩写、同义改写或与业务项目的画风段落混配。
4. 风格 3.1 用于正式生产、连续故事或多页作品时,必须把 `assets/style-3.1/anchor-family.png` 作为纯画风参考锚点随每张请求传入,并完整执行渲染器 JSON 的三阶段 `workflow`:基础生成 → `scribble-correction` → `scribble-chaos-correction`;前两阶段都只能算中间产物。锚点或任一修正阶段不可用就停止正式生产。
5. 其他画风默认只输出最终 prompt;风格 3.1 的正式生产默认输出 `family-crayon-card-v3` JSON 调用包,纯文本只允许显式 `--text-only-preview`。不生图;仓库维护者新增或验收画风时,按 `AGENTS.md` 的维护者验证例外执行。
