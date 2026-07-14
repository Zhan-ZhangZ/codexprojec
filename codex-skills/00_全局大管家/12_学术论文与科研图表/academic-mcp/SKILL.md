---
name: academic-mcp
description: 19+ 全球顶尖学术论文库统一联邦检索与解析网关 (MCP)。跨越数据库壁垒，一键聚合 arXiv、IEEE Xplore、PubMed 等巨头。支持极速跨源论文搜寻、高维元数据解析及 PDF 强制脱壳阅读，扫平文献综述第一公里。Leading Words: 19+学术库联邦检索, 跨源论文元数据解析, IEEE/PubMed/arXiv聚合, PDF强制脱壳阅读
---

# Academic MCP — 多源学术论文检索/下载/阅读

- **项目主页**: https://github.com/LinXueyuanStdio/academic-mcp

## 功能说明

`academic-mcp` 是一个基于 Python 的 MCP Server，提供三大核心工具：

| 工具 | 功能 |
|:---|:---|
| `paper_search` | 跨 19+ 学术数据库并发检索论文 |
| `paper_download` | 下载论文 PDF 到本地，返回文件路径 |
| `paper_read` | 从 PDF 中提取并阅读文本内容 |

### 支持的数据库（19+）

- **预印本**: arXiv, bioRxiv, medRxiv, IACR ePrint Archive
- **文献数据库**: PubMed, PubMed Central (PMC), Semantic Scholar, CrossRef
- **综合搜索**: Google Scholar, CORE
- **出版商**: Science Direct, Springer, IEEE Xplore
- **索引服务**: Scopus, OpenAlex
- 以及更多...

## 使用条件

- Python 3.10+
- `pip install academic-mcp` 或 `uv pip install academic-mcp`
- 大部分数据源免费，部分（如 Scopus、IEEE）可能需要机构授权或 API Key

## 快速开始

### 作为 MCP Server 使用

在 `claude_desktop_config.json` 或 Cursor 设置中添加：

```json
{
  "mcpServers": {
    "academic-mcp": {
      "command": "uvx",
      "args": ["academic-mcp"]
    }
  }
}
```

### 命令行直接使用

```bash
# 安装
pip install academic-mcp

# 检索论文
academic-mcp search "transformer attention mechanism" --source arxiv --limit 10

# 下载论文 PDF
academic-mcp download "10.1234/example.doi"

# 阅读论文内容
academic-mcp read ./downloaded_paper.pdf
```

## 详细指南

关于该技能的详细配置、支持的数据源列表和高级用法，请参考本地代码库中的 [README.md](./README.md)。
