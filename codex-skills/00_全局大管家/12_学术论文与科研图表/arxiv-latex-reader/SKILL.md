---
name: arxiv-latex-reader
description: arXiv 论文 LaTeX 原生源码剥离与精准公式还原器。直接穿透服务端下载、解压多文件包。彻底解决 PDF 复制产生的数学符号乱码及排版塌陷，精准抽取定理段落与公式矩阵，专为强数理学术任务设计。Leading Words: arXiv原生LaTeX剥离, 精准数学公式矩阵还原, PDF乱码与排版塌陷解决, 定理源码级别抽取
---

# arXiv LaTeX 源码解析 (arxiv-latex-reader)

## 概述

在阅读前沿物理、数学或人工智能领域的学术论文时，最痛苦的莫过于从 PDF 中直接复制复杂的数学公式。因为 PDF 规范的限制，复制出来的公式往往带有大量的乱码、丢失的希腊字母以及上下标错位。

`arxiv-latex-reader` 直接从 arXiv 官方源下载论文的 LaTeX 原始代码，解压并分类整理。AI 代理或用户可以直接读取论文的最底层 LaTeX 标记，获得 100% 准确、无任何误差的数学公式和推导细节。

## 何时使用该技能

当用户提出以下需求时，应使用该技能：
- 准确提取 arXiv 论文中的数学公式或公式推导过程。
- 检索论文中特定定理、引理或算法伪代码的 LaTeX 原文。
- 从 arXiv 获取论文中的原始表格或 TikZ 绘图代码。
- 对论文的整体 LaTeX 项目进行结构性阅读（如查看附录、辅助样式定义）。

## 快速上手指南

### 命令行运行

可以直接在终端运行附带的 Python 脚本：

```bash
# 自动下载并解压 arXiv ID 为 2303.12345 的源码包至当前目录
python3 scripts/fetch_latex.py 2303.12345

# 下载并解压到指定目录
python3 scripts/fetch_latex.py 2303.12345 --output-dir ./my_paper_source

# 下载后直接在源码中搜索包含 "Hamiltonian" 的行
python3 scripts/fetch_latex.py 2303.12345 --search "Hamiltonian"

# 下载后自动提取并列出文中主要的数学公式环境
python3 scripts/fetch_latex.py 2303.12345 --list-eqs
```

### 参数说明

- `arxiv_id` (位置参数): arXiv ID，例如 `2303.12345`，也支持旧版 ID 如 `hep-th/9912012`。
- `--output-dir`, `-o`: 自定义保存并解压的目录。若不填，默认在当前路径创建以 `[id]_latex` 命名的文件夹。
- `--search`, `-s`: 在解压的 `.tex` 源码中不区分大小写检索关键词，输出匹配行及所在行号。
- `--list-eqs`, `-e`: 启用后，将扫描所有 `.tex` 源码，提取标准的 LaTeX 数学公式环境（`$$`，`\[`，`\begin{equation}`，`\begin{align}`）并打印。

## 核心原则与最佳实践

1. **精准定位核心 LaTeX 文件**
   - 提取出来的源码包中可能包含多个文件。通常主文件为 `main.tex`、`ms.tex` 或与 arXiv ID 同名的文件。可以优先查找包含 `\begin{document}` 的 `.tex` 文件。

2. **解决 PDF 乱码的终极方案**
   - 当用户要求“解释公式（5）”或“推导公式（3）到（4）的过程”时，直接查看解压出的 LaTeX 源码能保证 100% 的符号准确性，从而避免 LLM 在理解公式时由于 PDF 提取乱码导致胡说八道。

3. **获取附录与补充材料**
   - 很多 arXiv 论文会将附录直接打包在源码中，但在 PDF 版本的正文中不展示。通过本工具，你可以直接访问包含附录的原始 `.tex` 文件。

## 常见任务

### 任务 1：提取无损公式用于论文撰写或推导

*输入*: "帮我把 arXiv 2303.12345 论文中关于 Transformer 注意力机制的公式提取出来，我要写到我自己的论文里。"

*执行步骤*:
1. 运行：`python3 scripts/fetch_latex.py 2303.12345 --search "Attention"`
2. 定位到相应的公式块，例如：
   ```latex
   \begin{equation}
   \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
   \end{equation}
   ```
3. 将完美的 LaTeX 公式直接呈献给用户，免除其手动敲公式或除错的烦恼。
