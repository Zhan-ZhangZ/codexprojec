# 本地集成记录

## 2026-11-23

- 上游：`xianyu110/ecommerce-video-skills`
- 固定提交：`96c49b349b7d975bda8f05ce6669c1d33500c269`
- 上游没有根 `SKILL.md`，新增本目录根入口；按任务路由 13 个上游子技能，没有改写子技能正文。
- 上游根 `README.md` 已为中文优先并同时包含英文说明，作为本技能中文 README 直接复用。

## 保留

- 13 个自包含子技能及其 `SKILL.md` 和脚本。
- 根级 `scripts/`、`requirements.txt`、可运行示例 `examples/aura-bottle` 与 `examples/viral-remake-demo`。
- README 所需的 `docs/credits.md`、MIT 许可证。

## 裁剪

删除仅服务上游开发、贡献和展示的内容：

- 嵌套 `.git`、`.gitignore`、GitHub 模板、Claude 插件包装。
- `CONTRIBUTING.md` 和 `tools/sync_scripts.py` 开发工具。
- `docs/media/aura-bottle-9x16.mp4` 演示视频。

裁剪判断：每个子技能按上游设计保持自包含，根级和子技能脚本均保留；删除项不参与脚本生成、配音、字幕、自动成片或平台导出。

## 链接适配

- README 的仓库内演示视频改为固定上游提交的原始视频 URL。
- README 的贡献指南与脚本同步工具改为固定上游提交 URL。

## 已知边界

- 上游 README 引用了 `skills/README.md`，但该文件在当前固定提交中不存在；这是上游原有缺链，保持原文不改。
- Edge TTS 需要联网；FFmpeg 必须包含 libass，否则字幕后处理会失败。
- 当前验证覆盖目录完整性、Python 语法、示例和 MCP 消费；AI 图生视频模型需用户自有账号，未做付费调用。

## 验证记录

- 客观项：59 个文件、约 0.8 MB，最长相对路径 99 字符；无 symlink、嵌套 Git 或 `.gitignore`。
- YAML/清单：根入口可解析，`name` 与 `description` 和 manifest 逐字一致。
- 语法：28 个 Python 文件通过内存编译；2 个 JSON 文件可解析。
- 示例合成：使用 `--tts none --no-subs --bgm none` 从 `examples/aura-bottle/storyboard.json` 成功生成 1080×1920、22.6 秒 MP4。
- Edge TTS：当前机器 `edge-tts 7.2.8` 访问微软朗读端点返回 HTTP 403，需在网络/服务恢复后重试；脚本本身通过语法与导入检查。
- 字幕：当前 Homebrew FFmpeg 8.1.1 未编译 libass，`ass`/`subtitles` 滤镜不可用；安装含 libass 的 FFmpeg 后按默认流程烧录字幕。
- 引用扫描：38 处未解析相对词主要是运行后生成的 `out/`、`build/`、示例输出与占位文件，3 处来自本记录的删除说明；未发现本次裁剪删掉运行脚本。
- MCP 消费：本地 catalog 搜索“商品图转 9:16 带货视频 电商 Skill”命中第 2；`read_skill` 返回根入口、依赖和 13 个子技能；文件树与 `skills/ffmpeg-auto-assemble/SKILL.md` 均可完整加载。
