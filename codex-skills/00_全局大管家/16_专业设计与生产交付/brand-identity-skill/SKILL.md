---
name: brand-identity-skill
description: 品牌视觉识别系统生成与评估技能。根据一份品牌 brief，将 Logo、字体和色彩作为同一系统共同设计，通过对比度、色盲模拟、字形覆盖、字体许可和小尺寸渲染进行量化检查，以身份板并排比较，支持现有网站改版预览，并为选定方案生成品牌规范 PDF、Logo 文件和设计 tokens。适用于新品牌、视觉识别刷新、单独 Logo/字体/配色或现有品牌审查。
license: MIT
metadata:
  upstream: https://github.com/fatihaydost/brand-identity-skill
  version: 1.1.1
  commit: 532742d7477dba3b744433adf92845642953dc28
---

# Brand Identity Skill

这是一个可执行的品牌视觉识别系统技能。正式执行入口位于：

- [完整技能指令](./skills/brand-identity/SKILL.md)
- [项目说明与示例](./README.md)
- [Python 依赖](./requirements.txt)

先读取完整技能指令，再检查本地运行环境。脚本、参考卡、模板和字体/语言目录均在 `skills/brand-identity/` 下。

## 环境检查

需要 Python 3.10+、Chromium 内核浏览器（Chrome、Chromium、Edge 或 Brave），推荐安装 `uv`。首次运行：

```bash
python3 skills/brand-identity/scripts/brand.py check
```

若依赖缺失，按脚本给出的 uv 安装提示处理。正式工作流、命令参数和输出契约以子技能 `SKILL.md` 为准。

## 能力边界

- 适合新品牌的视觉识别系统、Logo/字体/配色中的单项或混合任务、现有视觉识别刷新和审计。
- 本技能是独立技能，不并入、也不依赖 `brand-building-skills`；如任务同时需要其他品牌能力，由根管家按需选择对应技能。
- 技能负责提出方向、量化检查、身份板和规范套件；最终审美选择必须交给用户，不能在 checkpoint 自动替用户选定。
- 对比度、许可、字形覆盖、文件有效性和渲染失败属于测量门禁；启发式评分必须明确标注为警告或判断。

## 隐私与责任

- 只有用户提供 URL 时，才访问其站点或指定竞品站点；字体测量会访问 Google Fonts，Python 依赖可能从 PyPI 获取。
- 不进行商标检索。Logo 正式投入商业使用前，仍需自行完成目标国家/地区的商标与法律核查。
