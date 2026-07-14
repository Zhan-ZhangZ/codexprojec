---
name: zotero-connector
description: 个人私域 Zotero 文献库 (SQLite/Web API) 深层同步与萃取桥梁。赋予 Agent 打穿个人十年学术积淀的能力，极速倒排索引本地论文标签、笔记摘要及引证元数据，实现“第二大脑”科研知识内化调用。Leading Words: 私域Zotero文献库同步萃取, 个人学术第二大脑内化调用, SQLite/Web API穿透倒排索引, 论文标签笔记元数据打穿
---

# Zotero 文献库同步 (zotero-connector)

## 概述

Zotero 是科研人员最常用的文献管理工具之一。`zotero-connector` 为 AI 代理和用户提供了一个桥梁，可以直接读取本地 Zotero 客户端的数据库（`zotero.sqlite`），也可以连接云端的 Zotero Web API。这使得用户可以轻松通过对话检索自己的私人文献库，快速导出引用或查找论文。

## 何时使用该技能

当用户提出以下需求时，应使用该技能：
- 检索自己 Zotero 文献库中的特定论文。
- 确认某篇文献是否已保存在自己的 Zotero 库中。
- 列出自己收集的某个主题（比如大语言模型）的论文。
- 提取保存在 Zotero 中的论文摘要、作者或发表时间。
- 将 Zotero 里的文献导出为 Markdown 引用格式。

## 快速上手指南

### 命令行运行

可以直接在终端运行附带的 Python 脚本：

```bash
# 自动检测本地默认路径并检索关键字 "transformer"
python3 scripts/query_zotero.py "transformer"

# 指定本地 zotero.sqlite 文件的具体路径进行查询
python3 scripts/query_zotero.py "resnet" --db-path "/Users/username/Zotero/zotero.sqlite"

# 使用 Zotero Web API 远程查询（需提供用户 ID 和 API 密钥）
python3 scripts/query_zotero.py "agent" --user-id "1234567" --api-key "abcde123456789"
```

### 环境变量配置

为了避免每次都手动输入 API 密钥或用户 ID，可以将其配置为环境变量：

```bash
export ZOTERO_USER_ID="您的Zotero用户ID"
export ZOTERO_API_KEY="您的Zotero API Key"
```

### 参数说明

- `query` (位置参数): 检索关键词，将在标题、作者和摘要中进行不区分大小写的匹配。
- `--db-path`, `-d`: 本地 `zotero.sqlite` 的绝对路径。如果不填写，脚本将自动检测 macOS 上的默认 Zotero 路径。
- `--user-id`, `-u`: Zotero Web API 的 User ID（可在 Zotero 官网 settings/keys 中查看）。
- `--api-key`, `-k`: Zotero Web API 密钥。
- `--limit`, `-l`: 最大返回的条目数量（默认值为 `10`）。

## 核心原则与最佳实践

1. **本地数据库只读访问**
   - 脚本使用 `file:zotero.sqlite?mode=ro` (只读模式) 连接本地 SQLite，这样可以确保即便 Zotero 客户端正在运行，也不会因为锁库导致数据损坏或无法读取。

2. **Web API 优势**
   - 如果用户在多台设备上同步文献，并且希望在没有本地数据库的环境下运行此工具，强烈建议配置环境变量 `ZOTERO_USER_ID` 和 `ZOTERO_API_KEY`，脚本会自动切换为高性能的云端 API 查询。

3. **引用导出**
   - 提取到结果后，AI 可以根据用户需要的格式（如 APA, MLA 或 BibTeX）将 Zotero 文献信息重新排版。

## 常见任务

### 任务 1：从私人文献库查找论文摘要并写在综述里

*输入*: "帮我从我的 Zotero 文献库中查找关于 'diffusion model' 的文献，并帮我把它们的摘要整理成一段 200 字的中文文献综述。"

*执行步骤*:
1. 运行：`python3 scripts/query_zotero.py "diffusion model"`
2. 读取搜索结果中的论文标题、作者和摘要。
3. 整合摘要，撰写符合学术规范的中文文献综述。
