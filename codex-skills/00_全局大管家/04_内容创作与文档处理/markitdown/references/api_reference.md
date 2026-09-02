# MarkItDown API Reference（对应上游 v0.1.7）

> 来源：`packages/markitdown/src/markitdown/`（[_markitdown.py](https://github.com/microsoft/markitdown/blob/v0.1.7/packages/markitdown/src/markitdown/_markitdown.py)、[_base_converter.py](https://github.com/microsoft/markitdown/blob/v0.1.7/packages/markitdown/src/markitdown/_base_converter.py)、[_stream_info.py](https://github.com/microsoft/markitdown/blob/v0.1.7/packages/markitdown/src/markitdown/_stream_info.py)、[__main__.py](https://github.com/microsoft/markitdown/blob/v0.1.7/packages/markitdown/src/markitdown/__main__.py)）。

## MarkItDown 类

```python
from markitdown import MarkItDown

md = MarkItDown()                            # 默认：内置转换器开启，插件关闭
md = MarkItDown(enable_plugins=True)         # 加载第三方插件
md = MarkItDown(enable_builtins=False)       # 只用插件/手动注册（enable_builtins() 可后开）
```

构造参数为 keyword-only：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `enable_builtins` | `None`（视为 True） | 是否注册内置转换器 |
| `enable_plugins` | `None`（视为 False） | 是否加载 `markitdown.plugin` 入口点插件 |
| `requests_session` | 自动创建 | 自定义 `requests.Session`（可注入 `Accept: text/markdown` 等头） |
| `llm_client` / `llm_model` / `llm_prompt` | `None` | LLM 视觉描述（PPTX/图片），任意 OpenAI 兼容客户端 |
| `exiftool_path` | `EXIFTOOL_PATH` 环境变量或自动探测 | 图片 EXIF 读取的 exiftool 路径 |
| `style_map` | `None` | docx 样式映射 |
| `docintel_endpoint` | `None` | Azure Document Intelligence 端点（传入即启用） |
| `docintel_credential` / `docintel_file_types` / `docintel_api_version` | `None` | DI 凭据 / 限定格式 / API 版本 |
| `cu_endpoint` | `None` | Azure Content Understanding 端点（传入即启用） |
| `cu_credential` / `cu_analyzer_id` / `cu_file_types` | `None` | CU 凭据 / 指定分析器 / 限定路由格式 |

## convert 转换家族

v0.1.x 按「入口越窄越安全」设计。`convert()` 是万能入口，处理不可信输入时应改用更窄的专用入口：

| 方法 | 输入 | 典型场景 |
| --- | --- | --- |
| `convert(source)` | `str`（路径或 `http:/https:/file:/data:` URI）、`Path`、`requests.Response`、二进制流 | 万能入口，自动分发 |
| `convert_local(path)` | 本地路径（`str`/`Path`） | 只读本地文件时用它，拒绝 URL |
| `convert_stream(stream)` | 二进制文件对象 | 已持流（stdin、网络流、内存字节） |
| `convert_uri(uri)` | `http:`/`https:`/`file:`/`data:` URI | 显式按 URL 抓取 |
| `convert_response(response)` | `requests.Response` | 自己控制网络请求时 |

```python
result = md.convert("report.pdf")            # 本地路径
result = md.convert("https://example.com/a.docx")
with open("a.pdf", "rb") as f:               # 必须二进制模式
    result = md.convert_stream(f)
```

通用关键字参数：

- `stream_info=StreamInfo(...)`：显式提供流元数据（替代旧版 `file_extension=`，旧参数已弃用但仍接受）。
- 其余 kwargs 透传给转换器（如 `keep_data_uris=True` 保留 base64 data URI，默认截断）。

### StreamInfo

```python
from markitdown import StreamInfo

StreamInfo(
    mimetype="application/pdf",
    extension=".pdf",
    charset="utf-8",
    filename="a.pdf",     # 来自路径 / URL / Content-Disposition
    local_path="/tmp/a",  # 从磁盘读入时
    url="https://...",    # 从 URL 读入时
)
```

字段可全为 `None`，由 magika 内容嗅探补齐；CLI 的 `-x/-m/-c` 旗标即构造此对象。

## DocumentConverterResult

```python
result = md.convert("a.docx")
result.markdown        # Markdown 正文（v0.1.x 推荐写法）
str(result)            # 等价
result.title           # 文档标题，可能为 None
result.text_content    # 软弃用别名，指向 .markdown（旧代码无需改动）
```

## 自定义转换器

```python
from markitdown import MarkItDown, DocumentConverter, DocumentConverterResult, StreamInfo

class MyConverter(DocumentConverter):
    def accepts(self, file_stream, stream_info: StreamInfo, **kwargs) -> bool:
        return stream_info.extension == ".custom"

    def convert(self, file_stream, stream_info: StreamInfo, **kwargs) -> DocumentConverterResult:
        text = file_stream.read().decode("utf-8")
        return DocumentConverterResult(markdown=f"# Custom\n\n{text}", title="Custom")

md = MarkItDown()
md.register_converter(MyConverter())                    # 默认 priority=0（具体格式档）
md.register_converter(MyConverter(), priority=9)        # 数值越小越先尝试
```

优先级约定：具体格式转换器为 `PRIORITY_SPECIFIC_FILE_FORMAT`（0）；`PlainTextConverter`/`HtmlConverter`/`ZipConverter` 为 `PRIORITY_GENERIC_FILE_FORMAT`（10）。插件可用 0–10 之间的值插进内置转换器与兜底转换器之间。

## 插件系统

- 入口点组：`markitdown.plugin`，插件需暴露 `register_converters(md, **kwargs)`。
- 搜索 GitHub 话题标签 `#markitdown-plugin`；官方示例 [markitdown-sample-plugin](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown-sample-plugin)，官方 OCR 插件见 [cloud_and_plugins.md](cloud_and_plugins.md)。

```bash
markitdown --list-plugins        # 列出已安装插件
markitdown file.pdf -p           # 本次调用启用插件
```

```python
md = MarkItDown(enable_plugins=True)     # 或 md.enable_plugins()
```

## CLI 全旗标（`markitdown --help`）

| 旗标 | 说明 |
| --- | --- |
| `-o, --output <file>` | 输出文件，缺省写 stdout |
| `-x, --extension <ext>` | 扩展名提示（stdin 场景），自动补点、小写化 |
| `-m, --mime-type <mime>` | MIME 提示（须含一个 `/`） |
| `-c, --charset <cs>` | 字符集提示（Python codec 名，如 `utf-8`） |
| `-d, --use-docintel` | 用 Azure Document Intelligence（需 `-e`） |
| `-e, --endpoint <url>` | Document Intelligence 端点 |
| `--use-cu` / `--use-content-understanding` | 用 Azure Content Understanding（需 `--cu-endpoint`） |
| `--cu-endpoint <url>` | CU 端点 |
| `--cu-analyzer <id>` | 指定 CU 分析器；缺省按文件类型自动选择 |
| `--cu-file-types pdf,jpeg,mp4` | 逗号分隔，限定哪些格式走 CU |
| `-p, --use-plugins` | 启用第三方插件 |
| `--list-plugins` | 列出插件后退出 |
| `--keep-data-uris` | 保留 base64 data URI（默认截断） |
| `-v, --version` | 版本号 |

`-d` 与 `--use-cu` 互斥；stdin 场景 `markitdown < file.pdf` 等价于 `cat file.pdf | markitdown`。

## 异常类型

```python
from markitdown import MissingDependencyException, UnsupportedFormatException, FileConversionException
```

- `MissingDependencyException`：格式可识别但 extras 未装（按提示 `pip install 'markitdown[pdf]'`）。
- `UnsupportedFormatException`：无转换器认领该格式。
- `FileConversionException`：转换器认领但转换失败，`attempts` 中带各 `FailedConversionAttempt` 详情。

## 版本兼容

- Python ≥ 3.10（3.10–3.13）。
- PDF 依赖升级为 `pdfminer.six>=20251230` + `pdfplumber>=0.11.9`。
- 历史 breaking change（v0.0.x → v0.1.0）：依赖拆成 extras；`convert_stream()` 只收二进制流；转换器接口从路径改为流。
