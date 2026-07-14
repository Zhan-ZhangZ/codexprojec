# LexParse MCP 组装说明

本文档说明如何把当前项目从零组装成可运行的 LexParse MCP 服务。

## 1. 安装依赖

```bash
pip install -r requirements.txt
```

如果你计划处理 PDF 和 DOCX，请确保运行环境允许安装 `PyMuPDF`、`pdfplumber`、`python-docx`。

## 2. 配置环境变量

最少建议配置：

```bash
ANTHROPIC_API_KEY=your_api_key
LEXPARSE_PORT=8000
```

可选配置：

- `LEXPARSE_SONNET_MODEL`
- `LEXPARSE_HAIKU_MODEL`
- `LEXPARSE_AES_KEY`
- `LEXPARSE_SSE_MOUNT_PATH`
- `LEXPARSE_HTTP_MOUNT_PATH`

## 3. 确认项目组装关系

- `config.py`
  - 负责统一读取环境变量、配置日志、解析 AES Key
- `mcp_server/parsers/*`
  - 负责把 PDF、DOCX、文本转成统一纯文本
- `mcp_server/prompts/*`
  - 负责为不同文书类型提供独立的反幻觉 System Prompt
- `mcp_server/extractors/schemas.py`
  - 定义所有结构化输出 Schema
- `mcp_server/extractors/legal_extractor.py`
  - 串起解析器、Prompt、Anthropic、启发式回退逻辑
- `mcp_server/tools.py`
  - 把能力注册成 3 个 MCP Tool
- `mcp_server/server.py`
  - 生成 FastMCP 服务实例并支持不同 transport
- `main.py`
  - 本地 `stdio` 启动入口
- `app.py`
  - 云端 `FastAPI + SSE + Streamable HTTP` 启动入口
- `test.py`
  - 本地烟雾测试脚本

## 4. 本地先跑通测试

推荐先用内置示例验证：

```bash
python test.py --doc-type contract --compare-demo
python test.py --doc-type judgment
```

如果没有配置 `ANTHROPIC_API_KEY`，看到的是启发式结果；如果配置了，则优先走 Claude。

## 5. 启动 MCP 本地模式

```bash
python main.py
```

然后在 Claude Desktop 或 Cursor 的 MCP 配置中把命令指向 `main.py`。

## 6. 启动云端模式

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

启动后检查：

- `GET /health`
- `SSE` 入口位于 `/sse`
- `Streamable HTTP` 入口位于 `/mcp`

## 7. Docker 组装

```bash
docker build -t lexparse-mcp .
docker run --rm -p 8000:8000 -e ANTHROPIC_API_KEY=your_api_key lexparse-mcp
```

## 8. 推荐接入顺序

1. 先执行 `python test.py`
2. 再执行 `python main.py` 验证本地 MCP
3. 最后执行 `uvicorn app:app --host 0.0.0.0 --port 8000` 验证云端接口

## 9. 生产建议

- 敏感文书优先本地 `stdio`
- 云端部署时在外层反向代理启用 TLS
- 如需二次加密，可配合 `LEXPARSE_AES_KEY` 传入 `AESGCM` envelope
- 将结构化结果直接入库前，建议保留 `confidence` 与 `explanation` 供人工复核
