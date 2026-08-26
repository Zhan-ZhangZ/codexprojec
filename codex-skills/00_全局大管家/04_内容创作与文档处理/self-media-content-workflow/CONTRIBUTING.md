# Contributing

感谢你改进这套自媒体 Skills。

## 开始前

对于新增平台、状态流变化、发布能力或数据口径变化，先提交 Issue 说明场景、预期输出和安全边界。小型文案修正和错别字可直接提交 Pull Request。

## 开发规则

- 一个 Skill 只承担一个清晰职责。
- `SKILL.md` 保留核心流程，详细平台规则放入 `references/`。
- 可复制模板放入 `assets/`。
- 不绑定单一工具厂商。
- 不加入真实凭证、Cookie、Token、用户数据和私有链接。
- 不把暂时的平台限制写成永久规则。
- 行为变化需要说明人工确认点、失败路径和降级方案。

## 验证

```bash
python3 scripts/validate.py
```

如果修改了复杂行为，请使用一个不包含预期答案的真实场景做前向测试，并在 Pull Request 中记录结果。

## Pull Request

说明：

- 修改了什么
- 为什么修改
- 用户或开发者影响
- 安全边界是否变化
- 使用了哪些验证和测试

使用 conventional commit，例如：

```text
feat(self-media-short-video): add interview storyboard pattern
fix(self-media-platform-copywriting): prevent unsupported metric claims
docs(project): clarify project-local installation
```
