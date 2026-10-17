---
name: vahta
description: "Vahta 密钥检测与预防。提交前拦截密钥泄漏。Leading Words: 密钥检测, 泄漏拦截, vahta, key amnesia"
metadata:
  upstream: github.com/vahta-team/vahta
  entrypoint: managed-v2
  entrypoint_kind: router
---

<!-- codex-skills-managed-entrypoint:v2 -->
# vahta

Vahta 密钥检测与预防。提交前拦截密钥泄漏。

## 何时使用

适用任务：Vahta 密钥检测与预防。提交前拦截密钥泄漏。
相关检索词：Vahta、key-amnesia。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 选择子技能

先读取 `README.md` 的路由或目录说明，选择范围最窄且直接解决当前任务的嵌套技能，再读取它的 `SKILL.md`。只有任务确实跨多个阶段时才组合多个子技能。不要一次加载全部子技能。

当前可直接发现的子技能：

- `src/key_amnesia/skills/key-amnesia-hygiene/SKILL.md` — **key-amnesia-hygiene**：Advisory secret hygiene for chat, about-to-write, and about-to-run content. Use when the user pastes a secret, shares credentials in a message, or you are about to write a file or run a command that might contain an inl…
- `src/key_amnesia/skills/key-amnesia-migrate/SKILL.md` — **key-amnesia-migrate**：One-shot workflow to migrate a project's existing plaintext secrets (.env files, hardcoded API keys, config files) into the key-amnesia vault. Use when the user asks to "migrate to key-amnesia", "move my secrets to the …
- `src/key_amnesia/skills/key-amnesia-usage/SKILL.md` — **key-amnesia-usage**：Use key-amnesia (`ka`) so agents can run commands with secrets without ever reading vault values. Check state first (`ka status` / `ka list`), then prefer `ka run --cwd DIR --secret NAME --as NAME=ENVVAR -- ...`. Never …

## 执行

以选中的子技能说明为执行契约，并从本包根目录解析它引用的脚本、模板和参考资料。若 README 与子技能说明冲突，优先采用版本更新、离目标文件更近且能实际验证的那一份，并把冲突告诉用户。

## 本地入口

- `README.md`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/vahta-team/vahta
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
