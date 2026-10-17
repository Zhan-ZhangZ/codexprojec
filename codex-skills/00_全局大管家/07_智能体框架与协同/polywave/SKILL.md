---
name: polywave
description: "Polywave 多阶段编码编排器。用于把大型改动拆成侦察、实施蓝图、波浪执行与集成验证，并通过 polywave-tools 检查阶段边界和完成条件。"
---

# Polywave for Codex

Polywave 适合需要多个相互隔离的实施步骤、需要先侦察代码库再改代码，或需要把工作分派给多个实施代理的软件开发任务。

## 前置检查

1. 阅读 `README.md` 与 `references/live-loop-playbook.md`，确认当前安装版本和可用命令。
2. 确认 `polywave-tools` 可用，并检查当前仓库是否已有 Polywave 配置。
3. 缺少工具、配置或目标仓库路径时，先补齐前置条件；不要把未验证的脚本调用当作已完成。

需要显式定位技能目录时：

```bash
POLYWAVE_SKILL_DIR="${POLYWAVE_SKILL_DIR:-$HOME/.codex/skills/polywave}"
```

## 工作流

1. **侦察**：明确仓库根目录、功能描述和 IMPL 输出路径，使用 `polywave-scout` 收集事实并编写实施蓝图。
2. **验证计划**：用 `polywave-tools` 校验 IMPL；验证失败时修正计划，不直接进入实施。
3. **波浪执行**：从终端运行：

   ```bash
   scripts/run-polywave-wave <manifest-path> --wave <N> --repo-dir <repo-root>
   ```

   每个 wave 在独立 worktree 中执行。实施代理只能修改分配给它的范围。
4. **集成与复核**：运行 `polywave-tools finalize-wave`，再检查测试、构建和最终 diff。侦察或实施代理口头说“完成”不算完成，必须以工具回执和可复现验证为准。

## 约束

- 不绕过 `polywave-tools prepare-wave` / `finalize-wave` 的边界检查。
- 不在当前会话中强行启动 wave worker；当前可靠入口是独立终端中的 launcher。
- 需要 Program 拆分时使用 `polywave-planner`，需要共享类型或接口时使用 `polywave-scaffold-agent`，实施前可用 `polywave-critic-agent` 审查蓝图。
- 委托代理时的完整 prompt 由 `scripts/build-scout-prompt` 或 `scripts/build-wave-agent-prompt` 生成，避免遗漏必需上下文。

## 参考

- `README.md`
- `references/live-loop-playbook.md`
- `references/`
- `scripts/`
