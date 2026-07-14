# LexParse MCP

LexParse MCP 是一个面向 Claude Desktop、Cursor、Claude Code 的法律文书结构化处理服务，符合 Model Context Protocol (MCP) 标准，支持判决书、合同、起诉状等文书的一键结构化、风险分析和版本比较。

## 功能概览

- 支持 `PDF`、`DOCX`、纯文本输入
- 支持中国大陆 `CN` 与香港 `HK`
- 严格基于 `Pydantic v2` Schema 输出，主模型均带 `confidence` 和 `explanation`
- 提供 3 个 MCP Tool
  - `extract_legal_structure`
  - `analyze_legal_risks`
  - `compare_doc_versions`
- 同时支持本地 `stdio` 与云端 `FastAPI + SSE + Streamable HTTP`
- 未配置 `ANTHROPIC_API_KEY` 时自动降级为启发式抽取，便于本地联调
- 支持可选 `AES-GCM` 文档载荷解密

## 目录结构

```text
lexparse-mcp/
├── app.py
├── config.py
├── Dockerfile
├── main.py
├── README.md
├── requirements.txt
├── test.py
├── ASSEMBLY.md
└── mcp_server/
    ├── __init__.py
    ├── server.py
    ├── tools.py
    ├── extractors/
    │   ├── __init__.py
    │   ├── legal_extractor.py
    │   └── schemas.py
    ├── parsers/
    │   ├── __init__.py
    │   ├── base.py
    │   ├── docx_parser.py
    │   └── pdf_parser.py
    └── prompts/
        ├── system_prompt_complaint.md
        ├── system_prompt_contract.md
        ├── system_prompt_judgment.md
        └── system_prompt_risk.md
```

## 依赖安装

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 环境变量

```bash
ANTHROPIC_API_KEY=your_api_key
LEXPARSE_SERVICE_NAME=LexParse MCP
LEXPARSE_HOST=0.0.0.0
LEXPARSE_PORT=8000
LEXPARSE_DEFAULT_JURISDICTION=CN
LEXPARSE_SONNET_MODEL=claude-sonnet-4-6
LEXPARSE_HAIKU_MODEL=claude-haiku-4-5
LEXPARSE_SSE_MOUNT_PATH=/sse
LEXPARSE_HTTP_MOUNT_PATH=/mcp
LEXPARSE_AES_KEY=base64_or_raw_16_24_32_byte_key
```

## 本地测试

使用内置示例文本：

```bash
python test.py --doc-type contract --compare-demo
```

测试本地文件：

```bash
python test.py --file ./sample.pdf --doc-type auto
python test.py --file ./sample.docx --doc-type contract
```

## 启动方式

### 1. Claude Desktop / Cursor 本地 `stdio`

```bash
python main.py
```

Claude Desktop 配置示例：

```json
{
  "mcpServers": {
    "lexparse": {
      "command": "python",
      "args": ["E:/code_repo/LexParse MCP/main.py"]
    }
  }
}
```

### 2. 云端 `FastAPI + SSE + Streamable HTTP`

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

默认端点：

- Health: `GET /health`
- SSE: `/sse`
- Streamable HTTP: `/mcp`

## Docker 部署

构建镜像：

```bash
docker build -t lexparse-mcp:latest .
```

运行容器：

```bash
docker run --rm -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_api_key \
  -e LEXPARSE_AES_KEY=your_aes_key \
  lexparse-mcp:latest
```

## Tool 说明

### `extract_legal_structure`

输入参数：

- `document_content`: 文本、base64 字符串或原始字节
- `file_name`: 文件名，用于识别扩展名
- `doc_type`: `judgment | contract | complaint | auto`
- `jurisdiction`: `CN | HK`

输出：

- `JudgmentSchema | ContractSchema | ComplaintSchema | GenericLegalSchema`

### `analyze_legal_risks`

输入参数：

- `structured_document`: 上一步结构化 JSON
- `custom_risk_rules`: 可选自定义规则列表

输出：

- `RiskAnalysisResult`

### `compare_doc_versions`

输入参数：

- `previous_document`
- `current_document`

输出：

- `CompareDocVersionsResult`

## AES-GCM 载荷格式

如果设置了 `LEXPARSE_AES_KEY`，`document_content` 可以传入如下 JSON 字符串：

```json
{
  "encryption": "AESGCM",
  "nonce": "base64_nonce",
  "ciphertext": "base64_ciphertext"
}
```

服务会在解析前自动解密。

## 说明

- 为了便于本地联调，抽取器实现了两层策略：
  - 优先使用 Haiku 做文书类型预判，Sonnet 做结构化抽取与风险分析
  - 如果没有 `ANTHROPIC_API_KEY` 或请求失败，则降级为启发式规则
- `compare_doc_versions` 当前为纯结构化字段递归比对，适合作为 v2 可选能力的基础实现
- 更详细的组装与接入顺序见 [ASSEMBLY.md](./ASSEMBLY.md)
