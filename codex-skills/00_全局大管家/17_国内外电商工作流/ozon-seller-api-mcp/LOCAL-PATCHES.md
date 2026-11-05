# 本地集成记录

- 上游仓库：https://github.com/PCDCK/ozon-mcp
- 集成提交：`7e1bea2dd7510064311f1d357d014bb012a18847`
- 上游版本：0.6.0
- 集成日期：2026-10-28

## 本地适配

- 上游没有顶层 `SKILL.md`，根据实际 README、MCP 工具注册和运行代码新增薄入口，统一技能名为 `ozon-seller-api-mcp`。
- 新增 `README.zh-CN.md`，完整翻译上游英文 `README.md`。中文版将已剔除测试与贡献者文档的链接改为固定提交 URL。
- 保留 `src/`、`pyproject.toml`、`uv.lock`、`Dockerfile`、`.dockerignore`、`SECURITY.md`、英文 README 和 MIT `LICENSE`。

## 未纳入发布技能

- `.github/`：上游 CI 和仓库治理配置。
- `tests/`：上游离线、集成和真实账号测试，共包含测试夹具与样例响应。
- `.venv/`、`.pytest_cache/` 和所有 `__pycache__/`：依赖、测试及 Python 运行时缓存。
- 上游版本记录、贡献指南和 MCP 目录展示元数据。
- 上游用于生成订阅覆盖知识的维护脚本，不属于 Agent 调用链路。

## 已知边界

- 上游英文 README 仍保留指向测试夹具目录和贡献指南的开发链接。中文 README 已改为上游固定提交链接。
- 上游代码最近一次更新为 2026-04-17；集成时保留其固定 Swagger 快照。实际接入前应按 `SKILL.md` 要求核对 Ozon 当前 API 版本、弃用状态和订阅限制。
- 本技能不会自动验证真实账号凭据；本地离线测试通过不能代替用户自己的店铺只读烟测。
