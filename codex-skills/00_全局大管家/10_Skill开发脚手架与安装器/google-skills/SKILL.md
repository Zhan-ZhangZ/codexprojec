---
name: google-skills
description: Google 官方企业级 Agent 技能库与云端原生 (Cloud-native) Recipe 范本。以极其严苛的工程标准，展示如何将 Google Cloud (BigQuery/Firebase/GKE) 深度包装为智能体技能。作为大型团队制定企业级扩展标准的红宝书。Leading Words: Google官方技能范本, Cloud-native原生架构, 企业级Agent拓展标准, 谷歌云BigQuery/GKE桥接
---

# google-skills

- **项目主页**: https://github.com/google/skills

## 功能说明

Google 官方技能库：**128 个子技能**分四大桶——`cloud`（Agent Platform 部署/评估飞轮/端点管理、BigQuery、AlloyDB、GKE 等）、`ads`（Google Ads 账户与物料管理）、`analytics`（GA4 数据分析）、`developers`（Android Studio / Flutter & Dart 开发）。另附 `plugins/` 官方插件市场清单（指向各 Google 产品扩展仓）。

## 详细指南

- [README.md](./README.md) — 上游总说明（技能目录与使用方式）
- [index.json](./index.json) — 全部技能的机器可读索引

> 上游 `.agents/` 隐藏插件配置未随库分发（与 `plugins/` 重复），需要时访问 [上游仓库](https://github.com/google/skills)。
