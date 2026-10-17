---
name: Auto-Research-Skills
description: "自动化科研技能与工具精选目录。按研究、实验、论文、评审和复现阶段查找上游项目、技能集合与基准，并注明子模块安装和同名技能冲突。"
metadata:
  upstream: github.com/brycewang-stanford/Auto-Research-Skills
  entrypoint: managed-v2
  entrypoint_kind: catalog
---

<!-- codex-skills-managed-entrypoint:v2 -->
# Auto-Research-Skills

这是一个自动化科研资源目录，收录端到端研究系统、深度研究与文献工具、实验智能体、领域科学智能体、技能合集、基准和清单。目录本身不等于已经安装其中列出的全部技能。

## 何时使用

- 需要查找从 idea 到论文、文献综述、自动实验或科研评审的上游项目。
- 需要比较科研技能合集，或在本地建立可复用研究工具链。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取 `README.md` 中与任务阶段对应的目录和收录表。
2. 选定条目后访问它自己的仓库，核对许可证、维护状态、安装方式和实际技能入口。
3. 安装多个合集前检查 `catalog/collisions.json`，处理同名技能冲突；只引入当前任务需要的技能。

## 本地入口

- `README.md`
- `README_EN.md`
- `docs/`
- `catalog/`

## 上游

- https://github.com/brycewang-stanford/Auto-Research-Skills

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
