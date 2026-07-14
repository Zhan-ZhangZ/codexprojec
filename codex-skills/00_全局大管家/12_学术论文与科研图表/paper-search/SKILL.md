---
name: paper-search
description: 轻量级学术文献双源检索引擎。原生接入 arXiv 与 PubMed 两大学术数据库，支持极速反查并提取论文的标题、作者、来源、摘要等核心元数据，并可一键渲染为结构化的 Markdown 参考列表。Leading Words: 轻量学术文献双源检索, arXiv/PubMed元数据提取, Markdown规范参考列表, 快速学术定标器
---

# 文献学术检索 (paper-search)

## 概述

`paper-search` 是一个多学术数据源检索工具，支持从 **arXiv**（物理、数学、计算机科学等定量科学领域）和 **PubMed**（医学、生命科学、生物医学领域）并行获取并聚合最新的论文元数据。它非常适合帮助科研工作者、学生和投研分析师快速掌握某一技术或学科领域的最新研究动态。

## 何时使用该技能

当用户提出以下需求时，应使用该技能：
- 检索某一学术领域的最新论文或研究。
- 检索特定课题在生物医学（PubMed）或计算机/物理/数学（arXiv）方面的成果。
- 收集论文元数据以撰写综述或引言。
- 快速查找某篇特定论文的链接、发表年份或摘要。
- 自动生成符合学术规范的 Markdown 格式文献列表。

## 快速上手指南

### 命令行运行

该技能开箱即用，可以直接在终端运行附带的 Python 脚本：

```bash
# 检索关于 "quantum computing" 的所有文献（默认检索 arXiv 和 PubMed）
python3 scripts/search_papers.py "quantum computing"

# 仅检索 PubMed 并限定返回数量为 3 篇
python3 scripts/search_papers.py "cancer immunotherapy" --source pubmed --limit 3

# 将检索结果保存为 Markdown 文件
python3 scripts/search_papers.py "large language models" --output research_list.md
```

### 参数说明

- `query` (位置参数): 检索关键词，如 `"deep learning"` 或 `"graph neural networks"`。
- `--source`, `-s`: 数据源选择。可选：`arxiv`、`pubmed`、`all` (默认)。
- `--limit`, `-l`: 每个数据源返回的最大条数 (默认值: `5`)。
- `--output`, `-o`: 将排版好的 Markdown 结果保存到指定文件路径。

## 核心原则与最佳实践

1. **精准构建检索式**
   - 对于 arXiv，支持复杂的逻辑，但直接使用关键词最为稳妥。
   - 对于 PubMed，可以使用医学主题词（MeSH 词）如 `"neoplasms"` 代替通用 `"cancer"` 来获得更精准的检索。

2. **结果去重**
   - 脚本中内置了基于标题相似性的去重机制，即便两个库都有收录，也只会输出一条记录。

3. **文献追踪**
   - 总是附带官方链接（arXiv URL 或 PubMed PMID 链接），以便后续点击查看原文或下载 PDF。

## 常见任务

### 任务 1：自动编写小领域文献速递

让 Agent 检索最新的科研主题，并直接整理成学术周报或文献速递：

*输入*: "检索关于 RAG (Retrieval-Augmented Generation) 的最新 5 篇 arXiv 论文，并对每一篇做出简要的中文解读。"

*执行步骤*:
1. 调用脚本：`python3 scripts/search_papers.py "Retrieval-Augmented Generation" --source arxiv --limit 5`
2. 读取检索到的文章摘要。
3. 翻译并提炼核心贡献，为用户编写包含论文链接的学术速递。
