# 本地集成记录

## 2026-11-23

- 上游：`xixihhhh/clipforge`
- 上游版本：`0.11.1`
- 固定提交：`bded6ceaa46649068e8da5882d7c29fd8c977a3b`
- 上游没有根 `SKILL.md`，新增本目录根入口，只负责阅读顺序、子技能路由、运行边界和故障分流；没有改写两个上游子技能的正文。
- 复用上游中文 `README.md`，并保留英文 `README.en.md`、中英文教程 `TUTORIAL.md` / `TUTORIAL.en.md`。

## 保留

- Next.js Web 应用 `src/`、Electron 桌面运行层 `electron/`、Remotion 渲染组件 `remotion/`。
- MCP Server `mcp/`、CLI `bin/clipforge.mjs`、合成与构建脚本 `scripts/`。
- 子技能 `skills/clipforge-video/`、`skills/script-judges/`。
- 数据库迁移 `drizzle/`、Drizzle 配置、依赖锁定文件、Next.js/Tailwind/TypeScript 构建配置。
- Dockerfile、运行说明、故障排查、平台构图、字幕/剪辑、任务恢复、ASR 质量等操作文档。
- `public/` 中的界面示例、字体和运行素材，`integrations/`，AGPL 许可证及 NOTICE。

## 裁剪

删除仅服务上游开发、CI、评测或营销展示的内容：

- 嵌套 `.git`、`.gitignore`、GitHub 工作流、Claude 插件包装和仓库级 Agent 指令。
- `e2e/`、`src/**/__tests__/`、`vitest.config.ts`、`eslint.config.mjs`。
- `docs/` 下的营销网页、站点脚本、页面截图、视频和发布说明截图。

裁剪判断：删除内容不参与 ClipForge 的安装、启动、Web/桌面运行、MCP/CLI 调用、视频合成或用户操作说明。README/TUTORIAL 中被裁剪的图片已改指向固定上游提交。

## 链接适配

- README/TUTORIAL 的横幅、截图、示例图和发布说明截图改为固定提交的原始资源 URL。
- README 中的 CI 说明改为固定提交的上游工作流 URL。
- `docs/task-recovery.md` 明确：测试文件未随技能包发布，完整测试需在上游开发检出运行。

## 已知边界

- 应用版本为 `0.11.1`，上游两个嵌套子技能的 `metadata.version` 仍分别写作 `0.9.11`、`0.8.83`；这是上游元数据滞后，未修改子技能正文。
- AI 生成、云端模型和桌面打包都需要额外依赖或账号；免费路径仍需联网访问 Edge TTS 和免费素材源。
- 当前集成完成静态结构、脚本语法、清单/catalog 与 MCP 消费验证；未在当前环境完成全部云端模型付费调用。

## 验证记录

- 客观项：472 个文件、约 11.4 MB，最长相对路径 101 字符；无 symlink、嵌套 Git 或 `.gitignore`。
- 版本识别：`package.json` 为 `0.11.1`；两个子技能正文与固定上游提交一致。
- YAML/清单：根入口可解析，`name` 与 `description` 和 manifest 逐字一致。
- 语法：全部 JS/CJS/MJS 通过 `node --check`；1 个 Python 文件通过内存编译；32 个 JSON 文件可解析。
- 构建：`pnpm install --frozen-lockfile` 成功安装依赖；`pnpm build` 完成 Next.js 生产构建、TypeScript 检查与 50 个页面生成。
- 引用扫描：5 处未解析相对词中，`vitest.config.ts` 是本地裁剪记录的叙述性提及，`claude_desktop_config.json` 是 Claude Desktop 的外部用户配置名，`.clipforge.json` 是运行期元数据文件名；没有运行链路文件遗漏。
- `integrations/infinite-canvas/dist/clipforge.js` 是上游提交的宿主加载产物，被仓库根 `.gitignore` 的通用 `dist/` 规则挡住，已按运行闭包使用 `git add -f` 纳入。
- MCP 消费：本地 catalog 搜索“商品链接生成带货短视频 ClipForge”命中第 1；`read_skill` 返回根入口、依赖和 2 个子技能；文件树与 `skills/clipforge-video/SKILL.md` 均可完整加载。
