# 本地集成说明

- 上游：<https://github.com/wuguirongsg/coreldraw-mcp>
- 集成提交：`147e093b8537f36a86436e441c4a1e0589fa50eb`（2026-06-04）
- 许可：Apache-2.0

## 集成时改动

- 上游没有 `SKILL.md`；根据 README、`server/server.py`、工具模块和依赖文件新增根入口。
- 新入口保留上游双语 README。上游已有 `README-CN.md`，不复写或另造中文说明。
- 将英文 README 的贡献指南链接固定到上述上游提交，避免剔除开发治理文件后形成死链。
- 剔除嵌套 `.git`、`.gitignore`、上游 Harness/会话治理目录、多编辑器配置与规则、根目录
  Agent/Claude/Harness 开发文档、贡献指南、空的 `docs/` 以及端到端测试脚本。这些文件
  服务上游开发、会话治理和验证流程，不是 MCP 运行链路。
- 保留 Python 服务、Agent 层、工具实现、配置、依赖声明、`.env.example`、`.mcp.json`、
  双语 README、Apache-2.0 许可与 NOTICE。

## 已知问题

- 上游的 `requirements.txt` 和 `pyproject.toml` 都未声明 Streamlit，但
  `server/app.py` 会导入它；使用该界面时需单独安装。
- README 声明的 `server/templates/` 示例模板目录未出现在上游文件树中；运行模板任务时
  需要用户自备 CDR 模板。
- 上游测试和真实 COM 行为需要 Windows 上的 CorelDRAW；macOS 仅能完成语法、静态结构和
  MCP 文档消费验证，不能替代本机对象模型实测。

按集成职责边界，本次不修改上述上游代码或依赖声明。
