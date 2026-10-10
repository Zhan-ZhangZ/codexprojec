# skills-manager

`skills-manager` 是一款面向 Windows、macOS 和 Linux 的本地 AI Agent Skills 管理器。它使用中央技能库作为唯一可信来源，并通过软链接或受管理副本把技能分发到不同开发工具和项目。

> 当前版本：0.11.0

> 项目维护者：[`jyx203`](https://github.com/jyx203)

## 主要能力

- 管理任意本地项目目录，不要求目录预先包含 Skills，也不要求是 Git 仓库。
- 从中央技能库、技能集合、GitHub 仓库、本地目录或原始 `SKILL.md` 链接安装技能。
- 默认安装到项目的 `<项目>/.agents/skills`，并为不支持该标准目录的平台建立适配链接。
- 安装前按技能标识和内容哈希去重；同名不同内容会报告冲突，不会静默覆盖。
- 中央技能库支持分类、标签、筛选、更新检查、单项与批量更新。
- 多技能仓库可作为“技能包”整体管理，同时允许搜索、查看和选择其中的子技能。
- 技能市场提供 GitHub 近 7 天/30 天 Star 增长榜，并可选接入 X 与 Hugging Face 热度信号。
- 本地检测到的平台优先展示，Codex 始终位于编程平台首位。

## 支持的平台

编程类：

- Codex
- Claude Code
- Cursor
- GitHub Copilot
- Gemini CLI
- OpenCode
- Windsurf
- Trae
- Qwen
- Kiro

龙虾类：

- OpenClaw
- QClaw
- EasyClaw
- WorkBuddy

平台能力由数据库中的统一配置驱动，侧边栏、技能卡片和安装弹窗不再维护彼此独立的静态名单。

## 安装与下载

Windows 安装包在 GitHub Release 或本地构建产物的 `src-tauri/target/release/bundle/` 下提供。常见格式包括：

- NSIS：`.exe`
- MSI：`.msi`

macOS 未签名构建首次打开时，可能需要在“系统设置 → 隐私与安全性”中允许，或移除隔离属性：

```bash
xattr -cr "/Applications/skills-manager.app"
```

## 开发环境

需要：

- Node.js 18 或更高版本
- pnpm 9 或更高版本
- Rust stable
- Tauri 2 所需的系统依赖

安装依赖并启动：

```bash
pnpm install
pnpm tauri dev
```

常用验证命令：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
cd src-tauri
cargo test
```

构建 Windows 安装包：

```powershell
pnpm tauri build
```

## 项目结构

```text
skills-manager/
├─ src/                         React + TypeScript 前端
│  ├─ components/              通用与业务组件
│  ├─ pages/                   页面
│  ├─ stores/                  Zustand 状态
│  └─ test/                    前端测试
├─ src-tauri/
│  ├─ src/commands/            Rust/Tauri 命令
│  ├─ src/db.rs                SQLite 模型与迁移
│  └─ tauri.conf.json          桌面应用与打包配置
├─ docs/
│  ├─ design/                  中文设计文档
│  ├─ migrations/              中文迁移说明
│  └─ testing/                 中文验证记录
└─ release-notes/              历史版本说明
```

## 数据与隐私

- 技能文件、项目索引和 SQLite 数据库默认保存在本机。
- GitHub PAT 与 X Bearer Token 由本地设置保存，只用于对应 API 请求。
- 未经明确确认，不执行技能仓库中的外部脚本或 Hooks。
- Windows 无法创建软链接时不会静默降级为复制；应用会说明原因并要求明确确认。
- 应用只卸载自身创建并记录的项目技能，不删除无法确认归属的项目原生目录。

详见[安全策略](SECURITY.md)、[项目技能与技能包重构设计](docs/design/项目技能管理与技能包重构.md)和[数据迁移说明](docs/migrations/0.11.0-数据迁移说明.md)。

## 贡献

提交改动前请完成类型检查、Lint、前端测试、Rust 测试和构建验证。具体要求见[贡献指南](CONTRIBUTING.md)。

## 来源与署名

本项目由 `jyx203` 维护，基于 [`iamzhihuix/skills-manage`](https://github.com/iamzhihuix/skills-manage) 二次开发。克隆基点为提交 [`467d042`](https://github.com/iamzhihuix/skills-manage/commit/467d042)，即 `v0.10.0` 之后的第 4 个提交；当前派生版本为 `skills-manager 0.11.0`。

原项目作者与版权信息依照 Apache-2.0 许可证保留。完整来源说明见 [NOTICE](NOTICE)。

## 许可证

Apache-2.0
