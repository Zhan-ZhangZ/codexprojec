---
name: huashu-motion
description: 面向编码智能体的本机动效视频制作室：用 HTML 与 GSAP 把产品发布片、解说视频和动效短片写成可编辑代码，内置导演规则、20 种动效语言、模板与字体、ABC 配乐/音效、浏览器截帧渲染、Studio 点选评论迭代和 om CLI。
---

# huashu-motion

上游仓库没有顶层 `SKILL.md`；本入口只负责路由。真实技能正文在上游嵌套目录：

- [skills/huashu-motion/SKILL.md](skills/huashu-motion/SKILL.md) —— 必读入口
- [docs/CONTRACT.md](docs/CONTRACT.md) —— 可编辑合成与点选评论契约
- [README.md](README.md) / [README.en.md](README.en.md) —— 项目说明、安装方式与能力边界
- [THIRD_PARTY.md](THIRD_PARTY.md) —— GSAP、字体与采样等第三方授权

## 适用任务

用户要制作产品发布片、动效短片、解说视频、卡点/配乐视频，或要求在浏览器 Studio 中预览并“指着画面修改”时使用本技能。

## 执行路由

1. 执行前完整读取 `skills/huashu-motion/SKILL.md`，并按该入口继续读取 `references/` 下的导演、节奏、配色、声音、工艺与验证文档。
2. 先让上游技能正文决定创作流程；不要把本路由当作替代正文。
3. CLI 使用技能自带入口：
   ```sh
   OM="skills/huashu-motion/bin/om"
   "$OM" doctor
   "$OM" new <project-dir>
   "$OM" studio <project-dir> --no-open
   ```
4. 用户点选评论后，按上游正文的 `inbox` / `look` / `done` 循环处理，只修改评论指向的时间与元素。
5. 交付前执行上游要求的 `check`、`qa`、真实帧观看和独立审片流程；不得只以命令通过替代成片质量判断。

## 前置条件

- Node.js >= 22。
- 本机 Chrome、Chromium 或 Edge，用于预览、截帧、检查与渲染。
- FFmpeg；缺失项可用 `om doctor` 检查。
- 真乐器采样、Kokoro 中文口播、whisper 逐字对齐等能力是可选增强，按 README 首次使用时再下载或安装。

## 关键目录

- `skills/huashu-motion/references/`：导演方法、动效语言、节奏、声音、工艺、验证等完整参考。
- `cli/`：`om` 命令与本地渲染、声音、评论、QA 实现。
- `runtime/`：HTML/GSAP 合成运行时与动画库。
- `studio/`：本机浏览器编辑器。
- `templates/`：10 个起步模板。
- `fonts/`：随包字体与授权。
- `examples/`：`om demo` 使用的样片源码与资产。

## 失败处理

- 环境缺失时先运行 `skills/huashu-motion/bin/om doctor`，按输出补齐依赖。
- 本地预览或浏览器控制被宿主沙箱拦截时，向用户说明需要授权的操作，不要虚构预览结果。
- 渲染或检查失败时读取 CLI 错误与项目 `.om/` 状态；上游技能本体的缺陷只记录和规避，不在集成包内顺手修改实现。
