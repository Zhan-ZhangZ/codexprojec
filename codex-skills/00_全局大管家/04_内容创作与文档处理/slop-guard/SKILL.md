---
name: slop-guard
description: "规则型散文 AI 腔评分器（Slop Scoring）。纯程序化 0-100 打分，无 LLM 裁判、无 API 调用：默认 24
  条可配置规则、200+
  字面与结构启发式（破折号密度、名言式收尾、对比句式、套话词组、占位符、节奏失衡等），返回分数+档位标签+逐条违规上下文+具体修改建议；uvx
  slop-guard 一键起本地 MCP 服务（check_slop / check_slop_file），支持自定义规则 JSONL。Leading
  Words: AI腔评分, 散文linter, slop检测, 0-100打分, 规则引擎, MCP本地服务, 违规建议"
metadata:
  upstream: github.com/eric-tramel/slop-guard
  entrypoint: managed-v2
  entrypoint_kind: application
---

<!-- codex-skills-managed-entrypoint:v2 -->
# slop-guard

规则型散文 AI 腔评分器（Slop Scoring）。纯程序化 0-100 打分，无 LLM 裁判、无 API 调用：默认 24 条可配置规则、200+ 字面与结构启发式（破折号密度、名言式收尾、对比句式、套话词组、占位符、节奏失衡等），返回分数+档位标签+逐条违规上下文+具体修改建议；uvx slop-guard 一键起本地 MCP 服务（check_slop / check_slop_file），支持自定义规则 JSONL。

## 何时使用

适用任务：规则型散文 AI 腔评分器（Slop Scoring）。纯程序化 0-100 打分，无 LLM 裁判、无 API 调用：默认 24 条可配置规则、200+ 字面与结构启发式（破折号密度、名言式收尾、对比句式、套话词组、占位符、节奏失衡等），返回分数+档位标签+逐条违规上下文+具体修改建议；uvx slop-guard 一键起本地 MCP 服务（check_slop / check_slop_file），支持自定义规则 JSONL。
相关检索词：Slop Guard、slop评分、AI腔评分器、detector、anti-slop、linter、mcp、scoring。

先从下面列出的本地入口确认当前版本和真实用法；不要把包名当成已经安装、授权或验证过的能力。

## 执行

1. 读取与本任务直接相关的 README、安装说明和入口文件，确认所需运行时、权限与配置。
2. 从包管理文件和入口代码确认安装、构建、启动命令；优先运行仓库自带脚本，不自行替换成相近工具。
3. 完成任务后运行该仓库提供的测试、校验或最小可观察流程，并报告未满足的环境条件。

## 本地入口

- `README.md`
- `pyproject.toml`
- `docs/`

## 上游

- https://github.com/eric-tramel/slop-guard
- 如需核对最新行为，以上游仓库和本地固定版本的差异为准。

## 完成标准

交付用户要求的结果，并说明实际运行的命令、验证方式、仍需配置的凭据或未能验证的边界。
