# 本地集成记录

- 上游仓库：https://github.com/submindd/ru-listing-writer
- 集成提交：`b94938ef2de913b8430e0c9d1b52c3ff63709ce9`
- 集成日期：2026-10-28

## 本地适配

- 将 `SKILL.md` frontmatter 中的 `description` 改为中文，使其与源仓库全局清单逐字一致；正文和作者工作流保持不变。
- 新增 `README.zh-CN.md`，完整翻译上游英文 `README.md`，同时保留全部安装入口、必需输入、校验命令和许可证说明。

## 未纳入发布技能

- `.gitignore`：嵌套仓库配置，按源仓库规则删除。
- `scripts/__pycache__/`：本地 Python 缓存，不属于运行源码。

## 验证

- 两个 Python 脚本通过语法编译。
- 使用临时标题、描述和项目符号输入执行 `validate_listing.py`，输出全部通过。
