# Hypit 集成本地补丁说明

> 本文件登记本次集成对上游 `hypit-ai/hypit` 的所有改动与发现，供后续同步与维护参考。
> 上游版本：v0.1.8（commit 时间晚于 2026-09；活跃维护中）
> 集成日期：2026-09-28

## 1. 无价值文件 AI 审查结论

按集成规则 01_integration.md 第 1.3 节，对上游 `hypit-ai/hypit` 整树执行 AI 审查。

### 1.1 剔除清单（已删除）

| 路径/类型 | 大小 | 删除原因 |
|---|---|---|
| `.git/` | — | 主仓库嵌套 Git 会引发冲突与漏追踪 |
| `.github/` | 24K | CI 配置 / Issue 模板 / `publish-npm.yml` / `ISSUE_AUTOMATION_DESIGN.md`，纯上游开发流程基建 |
| `.claude/` | — | 与 `skills/hypit/` 内容重复的 Claude Code 技能安装占位（重复子树） |
| `.codex/` | — | 与 `skills/hypit/` 内容重复的 Codex 技能安装占位（重复子树） |
| `.gitignore`、`.gitattributes`、`.node-version`、`.puppeteerrc.cjs` | <1K | 上游开发环境配置 |
| `test/` | 28K | 上游测试夹具与 fixture（开发基建） |
| `packages/` | 11M | 122 个 npm 工作区包，运行时通过 `npx skills add hypit-ai/hypit -g` 拉取，本仓库只保技能/文档 |
| `services/` | 880K | Python 推理服务（whisperx / image-opencv / yt-dlp），运行时通过 npm 安装分发 |
| `pnpm-lock.yaml` | 273K | 依赖锁文件，离开 `packages/` 与 `services/` 后无运行链路价值 |

**合计剔除约 12.4MB / 124 个目录**，保留树 15MB / 490 个文件。

### 1.2 保留清单

| 路径 | 大小 | 保留原因 |
|---|---|---|
| `skills/hypit/` | 788K | 官方技能正文 + references/ 完整参考文档（约 30 篇 markdown） |
| `docs/` | 1.7M | VitePress 完整开发者文档站（英文 + 中文镜像） |
| `examples/` | 13M | 6 套真实工作流样例（SVML/SVS/SVRun + 资产） |
| `bin/hypit.mjs` `scripts/` | 28K | CLI 启动器与上游构建脚本（用户安装后由 npm 触发） |
| `hypit` | <1K | Shell launcher |
| `LICENSE` `README.md` `README.zh-CN.md` `CONTRIBUTING.md` `CONTRIBUTING.zh-CN.md` | — | 顶层文档 |
| `package.json` `tsconfig.json` `pnpm-workspace.yaml` | — | 项目元数据 |

## 2. 死链处置（`scripts/integration_check.py --refs` 扫描结果）

扫描总数：**69 处**死链（保留集 md/json 中指向不存在文件的相对引用）。

按集成规则三分类处置：

| 类型 | 处置 | 数量 |
|---|---|---|
| A. **上游原树本来就缺**（placeholder / 输出产物占位 / 上游文档引而未构建产物） | 保留原貌，集成信息中披露数量 | 58 |
| B. **本集成删除的开发基建被保留文档叙述性提及** | 保留原貌，集成信息中披露数量 | 11 |
| C. **本集成删除的运行链路文件** | 必须归零（补齐 / 改写引用） | **0** |

### 2.1 A 类 — 上游原树本来就缺（58 处）

引用技术路径：
- `align.ts`（命名约定示例）、`.test.ts`（glob 模式示例）、`path/to/source.svml`（路径占位）
- 输出产物占位：`hypit.results.json`、`FEEDBACK.json`、`value.json`、`result.json`、`transcript.json`、`output/final.mp4`、`ANALYSIS.md`、`PROGRESS.md`、`TIMELINE.md`
- 资产占位：`assets/miso.jpg`、`assets/card.html/png/card.png`、`assets/comparison.png`、`assets/product-*.mp4`、`assets/narration-edited.wav`、`assets/opening.mp4`、`assets/recording.mp4`、`assets/voice.wav`、`assets/characters/portraits-0.webp`、`assets/final-half/drinking-illustration.{png,prompt.txt}`
- 示例路径占位：`references/ad/source.mp4`、`references/ad/transcript.json`、`references/ad/evidence/list-change.{jpg,mp4}`、`references/ad/evidence/opening.jpg`
- 组件样例：`./vendor/studio-score-strip-1.2.0.tgz`、`schedule.ts`（示例组件名）、`scripts/capture-product.mjs`（示例脚本名）

这些文件在上游原树（`https://github.com/hypit-ai/hypit` master）同样缺失，多为文档示例占位或运行产物名称——属于叙述性引用。

### 2.2 B 类 — 本集成删除的开发基建被提及（11 处）

| 引用文件 | 目标 | 性质 |
|---|---|---|
| `package.json` | `test/run.mjs` | 上游 `scripts.test` 指向的测试入口 |
| `CONTRIBUTING.md` | `.github/ISSUE_AUTOMATION_DESIGN.md` | 上游 issue 自动化设计文档 |
| `CONTRIBUTING.md` | `packages/studio/LOCALIZATION.md` | Studio 本地化贡献指引（在 packages 中） |
| `CONTRIBUTING.md` | `publish-npm.yml` | GitHub Actions 发布工作流 |
| `CONTRIBUTING.zh-CN.md` | 同上三处 | 中文版 CONTRIBUTING 镜像 |
| `skills/hypit/references/production/studio.md` | `packages/studio/LOCALIZATION.md` | Studio 本地化文档 |
| `skills/hypit/references/production/studio.md` | `packages/studio/locales/en.json` | Studio 英文语言包 |
| `skills/hypit/references/production/studio-companions.md` | `packages/studio/INSPECTOR.md` | Inspector 开发者文档 |
| `skills/hypit/references/production/studio-companions.md` | `packages/temporal-markup/EDITING.md` | Temporal Markup 编辑文档 |

均为开发流程文档 / 内部翻译资源的叙述性引用，保留原貌。

### 2.3 C 类 — 运行链路死链（0 处）

**无**运行链路文件被本次集成误删，闭包复检通过。

## 3. 上游已知问题（仅登记，不修复）

按「上游缺陷不修技能本体」原则，本次集成仅登记上游原状问题，**严禁**就地修改上游代码：

| 问题 | 位置 | 规避方案 |
|---|---|---|
| 缺 npm `dist/` 时 `bin/hypit.mjs` 与 `hypit` shell 启动器无法运行 | `bin/` `hypit` | 用户必须先 `npx skills add hypit-ai/hypit -g` 安装运行时，本仓库 bin/scripts/ 仅供对照参考 |
| 大量文档以 `outputs/*.json`、`outputs/*.mp4` 为示例路径（既非上游产物也不在本仓库） | `docs/`, `skills/hypit/references/production/`, `examples/` | 上游提示：「执行 Build 后会落到这些路径」，本地构建时自然出现，不构成功能缺失 |
| `references/production/component-sharing.md` 引用本地 vendor tarball `./vendor/studio-score-strip-1.2.0.tgz` | `skills/hypit/references/production/component-sharing.md` | 上游演示外部组件导入流程的占位文件名 |

## 4. 元数据登记

- 顶层 `SKILL.md` frontmatter：`metadata.upstream = "github.com/hypit-ai/hypit"`、`metadata.version = "v0.1.8"`
- `技能仓库索引.md` 增行：「05_多媒体与设计资产」类目
- `skills_manifest.json` 增条目：`name = "hypit"`、`category = "05_多媒体与设计资产"`、`folder = "hypit"`、`relative_path = "./00_全局大管家/05_多媒体与设计资产/hypit"`

## 5. 验证

- 客观项准入检查：`python3 scripts/integration_check.py "codex-skills/00_全局大管家/05_多媒体与设计资产/hypit"` → ✅ 通过
  - 共 490 个文件，最长相对路径 126 字符（阈值 200 / 硬性上限 219）
  - SKILL.md 存在
  - 无重名重复集成
- 引用完整性闭包复检：`python3 scripts/integration_check.py "..." --refs` → 69 处死链，A/B/C 三分类已记录，本集成零运行链路断链