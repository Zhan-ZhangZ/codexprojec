---
name: google-scholar-mcp
description: Google Scholar 纯净联邦检索引擎与 H-index 学者追踪器 (MCP)。深耕谷歌学术池，精准解析论文引证图谱 (Citation Graph)、作者学术画像及被引爆发趋势。专供高并发学者动态监视与开题定标。Leading Words: GoogleScholar联邦检索, 学者H-index画像追踪, 纯净引证图谱CitationGraph, 学术开题定标与爆发趋势
---

# Google Scholar MCP — Google 学术检索桥接

- **项目主页**: https://github.com/JackKuo666/Google-Scholar-MCP-Server

## 功能说明

Google Scholar 是全球使用最广泛的学术搜索引擎，但它没有官方 API。`google-scholar-mcp` 通过 MCP 协议为 AI 代理提供了一个标准化的 Google Scholar 访问接口。

### 核心工具

| 工具 | 功能 |
|:---|:---|
| `search_google_scholar` | 论文检索，支持关键词、年份范围、排序方式等高级参数 |
| `get_author_info` | 查询作者的学术画像（发文数、引用数、机构） |
| `get_citation_info` | 获取特定论文的引用信息 |

### 特点

- 无需 API Key，完全免费
- 支持通过 Smithery 一键安装
- 内置防反爬策略（请求延迟）

## 使用条件

- Python 3.10+
- 网络访问 Google Scholar（可能需要代理）

## 快速开始

### 通过 Smithery 安装

```bash
npx -y @smithery/cli install @JackKuo666/google-scholar-mcp-server --client claude
```

### 手动配置

```json
{
  "mcpServers": {
    "google-scholar": {
      "command": "python",
      "args": ["-m", "google_scholar_mcp"]
    }
  }
}
```

## 注意事项

- Google Scholar 会对高频自动化请求进行限制，建议设置合理的请求间隔
- 如果遇到 IP 被封，可配置代理服务器
- 适合用于辅助文献综述、了解论文引用关系，不适合大规模批量爬取

## 详细指南

关于该技能的安装步骤和参数配置，请参考本地代码库中的 [README.md](./README.md)。
