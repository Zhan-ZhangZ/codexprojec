---
name: brooks-lint
description: 深度的架构与代码防退化审查工具（Linter）。融合六大软件工程经典名著理念，用于发起重量级的 PR 评审（Code Review）、架构坏味道诊断（Architecture Audit）、技术债评估与单元测试质量审查。当需要对关键组件进行严格的重构或质量把控时调用。Leading Words: 深度代码审查, PR Review, 架构退化审计, 技术债评估, 测试用例质量, 软件工程规范
metadata:
  version: "1.5.0"
  upstream: github.com/hyhmrright/brooks-lint
---

# brooks-lint

- **项目主页**: https://github.com/hyhmrright/brooks-lint

## 功能说明
基于十二本经典软件工程书籍的 AI 代码评审工具 —— 输出带书籍出处、严重程度标签与健康分（Health Score）的系统退化风险诊断，所有结论遵循「症状 → 根源 → 后果 → 对策」铁律格式。共六个分析模式：

| 模式 | 入口 | 用途 |
| --- | --- | --- |
| PR 评审 | `skills/brooks-review/` | 重量级 Code Review，识别代码衰退风险 |
| 架构审计 | `skills/brooks-audit/` | 架构坏味道与腐化诊断（含新成员上手审计） |
| 技术债评估 | `skills/brooks-debt/` | 技术债盘点与偿还优先级 |
| 测试质量 | `skills/brooks-test/` | 单元测试有效性审查（测试衰退风险） |
| 健康看板 | `skills/brooks-health/` | 一次跑完四个维度，给出整体健康分 |
| 全量清扫 | `skills/brooks-sweep/` | 全维度诊断后直接落地修复（安全项自动应用，风险项确认后执行） |

各模式共享的框架文件（铁律、报告模板、衰退风险定义、书目清单）位于 `skills/_shared/`；斜杠命令包装位于 `commands/`，会话启动钩子位于 `hooks/`；配置模板见 `.brooks-lint.example.yaml`，各平台安装方式见 `scripts/install.sh` 与 `docs/getting-started.md`。

## 详细指南
关于该技能的详细配置、安装矩阵、触发提示词和执行命令，请参考本地代码库中的 [README.md](./README.md)（中文版 [README.zh-CN.md](./README.zh-CN.md)），版本变更见 [CHANGELOG.md](./CHANGELOG.md)。
