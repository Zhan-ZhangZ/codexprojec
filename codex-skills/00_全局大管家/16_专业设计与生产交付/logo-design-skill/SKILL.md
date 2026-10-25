---
name: logo-design-skill
description: 专业 Logo 与品牌标记设计技能。从需求访谈、设计 brief、词义图谱和标记类型选择开始，生成并几何化构建 SVG 概念，执行 16px、单色、反白、镜像、货架竞品与 SVG 结构审计，在概念检查点停止并由用户选择方向，再交付配色、字体锁定、行业样机板、规范、favicon 与应用图标。内置 1,400+ 个已分类真实 Logo SVG 参考库，用于学习结构、分析行业惯例和避免撞款，不可复制或描摹。
license: MIT
metadata:
  upstream: https://github.com/kaankiziltug/logo-design-skill
  version: 1.4.5
  commit: 734090317a2155c5bf1ae8bd4cc85c6848a0128f
---

# Logo Design Skill

这是完整、可执行的品牌标识设计技能。正式入口位于 [skills/logo-design/SKILL.md](./skills/logo-design/SKILL.md)，中文说明见 [README.zh-CN.md](./README.zh-CN.md)，英文原文见 [README.md](./README.md)。

## 适用模式

| 任务 | 入口 |
|---|---|
| 新 Logo、字标、字母标、徽章、吉祥物 | 内层 SKILL 的 Design 模式 |
| 审查现有 Logo | `references/critique.md` |
| 刷新或重塑 Logo | `references/redesign.md` |
| 品牌系统、子品牌、图案、动态标识 | `references/identity-system.md` |
| favicon、应用图标和交付变体 | `scripts/export_variants.py` |

## 执行约束

- Python 3.8+ 即可运行依赖为零的脚本；PNG、favicon 和 HTML 截图需要可用的 Chrome、Inkscape、rsvg、cairosvg 或 macOS Quick Look 渲染器。
- 设计时必须先建立 brief、研究参考库并构建黑稿 SVG，运行审计与预览测试；不能只凭文字描述宣称方案可用。
- 概念阶段展示带推荐意见的总览图后必须停止，等待用户选择；只有用户确认方向后才制作完整套件。
- 参考库中的 Logo 是各品牌商标，仅供学习和比较，不能复制、描摹或作为生成输出。
- 无法进行商标清查；交付时应明确提醒用户完成官方商标检索与字体授权核查。

## 关键文件

- [完整设计流程](./skills/logo-design/SKILL.md)
- [参考库使用指南](./skills/logo-design/references/library-guide.md)
- [SVG 构建规范](./skills/logo-design/references/svg-construction.md)
- [测试清单](./skills/logo-design/references/testing-checklist.md)
- [工具脚本](./skills/logo-design/scripts/)
- [品牌指南模板](./skills/logo-design/templates/brand-guidelines-template.md)
