---
name: Atomic-Chat
description: "本地大模型桌面聊天客户端（Agent Skills Hub local-llm 场景实测首选，Tauri 实现）。隐私优先本地推理，web-app 前端 + src-tauri 原生壳，附架构决策记录。Leading Words: 本地大模型, 桌面LLM客户端, 隐私聊天, tauri, atomic chat"
metadata:
  upstream: "github.com/AtomicBot-ai/Atomic-Chat"
---

# Atomic-Chat

**上游仓库**：<https://github.com/AtomicBot-ai/Atomic-Chat>

本地 LLM 桌面客户端（Tauri）：[web-app/](web-app/) 前端、[src-tauri/](src-tauri/) 原生壳、[docs/decisions/](docs/decisions/) 架构决策记录。

## 集成说明（本库维护）

- 集成日期：2026-10-10；来源：Agent Skills Hub 热门场景榜单（对应场景实测首选）。
- 剔 docs 站点源码 235M（src/public/static/tests）/tests/.claude 等；保留应用源码（web-app+src-tauri）与 docs/decisions ADR。
