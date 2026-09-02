# 云端转换、OCR 插件、MCP 服务器与 Docker（对应上游 v0.1.7）

> 来源：[主 README](https://github.com/microsoft/markitdown/blob/v0.1.7/README.md)、[markitdown-ocr](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown-ocr)、[markitdown-mcp](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown-mcp)。

## Azure Document Intelligence（PDF 专用云转换）

云端版式分析，扫描件、复杂表格、多页文档质量高于本地离线抽取。仅 PDF（可经 `docintel_file_types` 限定）。

```bash
pip install 'markitdown[az-doc-intel]'
markitdown scan.pdf -d -e "https://YOUR-RESOURCE.cognitiveservices.azure.com/"
```

```python
from markitdown import MarkItDown

md = MarkItDown(docintel_endpoint="https://YOUR-RESOURCE.cognitiveservices.azure.com/")
print(md.convert("scan.pdf").markdown)
```

凭据走 Azure DefaultAzureCredential 链（环境变量 `AZURE_DOCUMENT_INTELLIGENCE_KEY` 等），也可用 `docintel_credential=` 显式传入。资源开通见[官方指南](https://learn.microsoft.com/azure/ai-services/document-intelligence/how-to-guides/create-document-intelligence-resource?view=doc-intel-4.0.0)。

## Azure Content Understanding（多模态云转换）

单一 `cu_endpoint` 覆盖文档、图片、音频、视频（唯一支持视频的路径），预置/自定义分析器可抽取结构化字段并以 YAML front matter 输出。

```bash
pip install 'markitdown[az-content-understanding]'
markitdown report.pdf --use-cu --cu-endpoint "<cu_endpoint>"
markitdown video.mp4 --use-cu --cu-endpoint "<cu>" --cu-file-types mp4
```

```python
from markitdown import MarkItDown
from markitdown.converters import ContentUnderstandingFileType

md = MarkItDown(cu_endpoint="<cu_endpoint>")            # 按类型自动选分析器
md = MarkItDown(cu_endpoint="<cu_endpoint>",
                cu_analyzer_id="my-invoice-analyzer")   # 指定分析器抽字段
md = MarkItDown(cu_endpoint="<cu_endpoint>",
                cu_file_types=[ContentUnderstandingFileType.PDF])  # 限定计费范围

result = md.convert("invoice.pdf")
print(result.markdown)   # 输出含 YAML front matter 字段 + 正文
```

三种转换路径对比：

| 能力 | 内置离线转换器 | Document Intelligence | Content Understanding |
| --- | --- | --- | --- |
| 文档转换 | 离线、按格式 | 云端版式抽取 | 云端多模态抽取 |
| 结构化字段 | 无 | 不暴露 | YAML front matter |
| 自定义分析器 | 无 | 不可配 | 支持（`cu_analyzer_id`） |
| 音频/视频 | 基础音频 / 无视频 | 不支持 | 音视频分析器 |
| 成本 | 本地算力 | Azure 计费调用 | Azure 计费调用 |

## markitdown-ocr 官方 OCR 插件

LLM Vision 插件，为 PDF、DOCX、PPTX、XLSX 的内嵌图片抽取文字，扫描 PDF 有整页 OCR 回退；复用与图片描述相同的 `llm_client`/`llm_model` 模式，不引入新 ML 依赖。上游文档见 [OCR 插件官方 README](https://github.com/microsoft/markitdown/blob/v0.1.7/packages/markitdown-ocr/README.md)。

```bash
pip install markitdown-ocr
pip install openai   # 或任意 OpenAI 兼容客户端
markitdown --list-plugins          # 应列出 markitdown-ocr
markitdown scan.pdf -p             # CLI 启用插件（LLM 凭据经 Python API 传入更常用）
```

```python
from markitdown import MarkItDown
from openai import OpenAI

md = MarkItDown(enable_plugins=True, llm_client=OpenAI(), llm_model="gpt-4o")
print(md.convert("document_with_images.pdf").markdown)

# 自定义抽取提示词
md = MarkItDown(enable_plugins=True, llm_client=OpenAI(), llm_model="gpt-4o",
                llm_prompt="Extract all text from this image, preserving table structure.")
```

未提供 `llm_client` 时插件照常加载但静默跳过 OCR，回退内置转换器。

## MCP 服务器（markitdown-mcp）

独立包 `markitdown-mcp`，暴露一个工具 `convert_to_markdown(uri)`（支持 `http:`/`https:`/`file:`/`data:`），STDIO / Streamable HTTP / SSE 三种传输：

```bash
pip install markitdown-mcp
markitdown-mcp                                   # STDIO（默认，Claude Desktop 等）
markitdown-mcp --http --host 127.0.0.1 --port 3001   # 本机 HTTP/SSE
```

> 安全：HTTP/SSE 模式默认只绑 localhost，供本地可信 Agent 使用；不要暴露到公网。Claude Desktop 场景推荐 Docker 镜像。

## Docker

```bash
# 主工具（克隆仓库后于仓库根构建）
git clone https://github.com/microsoft/markitdown.git && cd markitdown
docker build -t markitdown:latest .
docker run --rm -i markitdown:latest < ~/file.pdf > output.md

# MCP 服务器（本地文件需挂载）
docker build -t markitdown-mcp:latest .
docker run -it --rm -v /home/user/data:/workdir markitdown-mcp:latest
```
