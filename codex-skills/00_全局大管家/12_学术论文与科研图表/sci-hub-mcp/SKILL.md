---
name: sci-hub-mcp
description: Sci-Hub 闭源文献 PDF 强行破壁与全文接管引擎 (MCP)。依托 DOI 或精准书目元信息，越过出版商付费墙瞬间拉取学术论文原本。解决文献综述阶段「查得到、拿不到」的科研最后一公里痛点。Leading Words: Sci-Hub出版商破壁, 闭源学术PDF强行拉取, DOI精准文献原本接管, 科研综述最后一公里
---

# Sci-Hub MCP — 论文全文 PDF 获取

- **项目主页**: https://github.com/JackKuo666/Sci-Hub-MCP-Server

## 功能说明

在学术研究中，找到论文的元数据（标题、摘要、DOI）只是第一步，获取论文全文才是真正的研究需求。`sci-hub-mcp` 通过 MCP 协议桥接 Sci-Hub，让 AI 代理可以直接获取论文的完整 PDF 内容。

### 核心工具

| 工具 | 功能 |
|:---|:---|
| `search_scihub_by_doi` | 通过 DOI 精确获取论文全文 PDF |
| `search_scihub_by_title` | 通过论文标题模糊检索并获取 PDF |
| `search_scihub_by_keyword` | 通过关键词发现相关论文并获取 PDF |

### 与其他论文检索技能的协同

本技能定位为**论文获取的最后一公里**，建议与其他检索工具配合使用：

```
paper-search-mcp → 发现论文元数据（标题、DOI、摘要）
       ↓
sci-hub-mcp → 通过 DOI 下载论文全文 PDF
       ↓
arxiv-latex-reader → 提取 LaTeX 公式（如果是 arXiv 论文）
```

## 使用条件

- Python 3.10+
- `pip install -r requirements.txt`
- 需要能访问 Sci-Hub 的网络环境

## 快速开始

### MCP Server 配置

```json
{
  "mcpServers": {
    "sci-hub": {
      "command": "python",
      "args": ["server.py"],
      "cwd": "/path/to/sci-hub-mcp"
    }
  }
}
```

## 注意事项

- Sci-Hub 的可用性取决于网络环境，域名可能会变化
- 建议优先使用合法渠道（机构订阅、Open Access）获取论文
- 本工具适合个人科研用途，请遵守当地法律法规

## 详细指南

关于该技能的安装和使用细节，请参考本地代码库中的 [README.md](./README.md)。
