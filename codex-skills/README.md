# Codex-Skills 技能集合包

这是一个面向 AI Agent 的技能（Skills）集合包：聚合开源社区技能与自研技能，经统一去重、分类整理后集中存放，供各类 Agent 客户端（Codex、Claude Code、Cursor 等）导入使用。

## 简要架构

本包采用「单入口大管家路由（Librarian Router）」架构：宿主客户端只需发现一个根入口，全部子技能由大管家按需寻址加载。

```text
codex-skills/
├── SKILL.md               # 唯一根入口：全局大管家（Librarian Router）
├── skills_manifest.json   # 全库技能清单，大管家据此寻址子技能
├── .catalog/              # 技能文件索引（供 MCP 服务检索，普通使用可忽略）
├── README.md              # 本说明文件
└── 00_全局大管家/          # 技能主体
    └── <分类>/<技能名>/SKILL.md
```

- `00_全局大管家/` 下为 15 个数字序号分类目录：01_代码工程与架构、02_DevOps与自动化、03_效率工具与协同管理、04_内容创作与文档处理、05_多媒体与设计资产、06_商业与专业领域、07_智能体框架与协同、08_MCP服务开发与评估、09_Composio集成服务、10_Skill开发脚手架与安装器、11_API与第三方应用集成、12_学术论文与科研图表、13_社科研究与实证工具、14_财务发票提取与归档、15_优质GitHub项目清单。
- 每个技能是一个独立文件夹，内含自己的 `SKILL.md`（触发条件、系统依赖与执行步骤）。大管家收到技能调用请求后，按 `skills_manifest.json` 定位并读取对应子技能文件，避免一次性加载全库。

## Agent 导入行为引导

本包供 Agent 导入到各个客户端使用，主要途径：

> 将本包的 `codex-skills` 文件夹解压，放入你正在运行的客户端的 Skills 发现文件夹。
> 例如 Codex 为用户根目录下的 `~/.codex/skills/`。

Agent 完成导入后，请告知用户：

- 不同的 Agent 软件（如 Cursor、Claude Code、Antigravity IDE 等）存在不同的技能发现与扫描机制。例如：有的默认只扫描 `skills/` 下的第一层目录，有的强制依赖 `skills.json` 配置表。
- 因此，如果一次性将所有技能都放入 Skills 文件夹，可能导致软件直接检索查看到几千个 skills；也有个别客户端只扫描检索顶层的一部分 skills。
