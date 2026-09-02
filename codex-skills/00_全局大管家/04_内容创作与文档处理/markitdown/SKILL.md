---
name: markitdown
description: 文档与图文跨模态转换至 Markdown 格式的编译神器。可以将任何复杂的 Office 格式文档、带有数学公式的 PDF 及图文混排文章完美清洗并逆向还原为干净、纯粹的 Markdown。Leading Words: Office转Markdown, 复杂图文提取, 文档格式清洗与逆向
allowed-tools: Read Write Edit Bash
license: MIT license
version: 0.1.7
metadata:
    skill-author: K-Dense Inc.
    upstream: github.com/microsoft/markitdown
---

# MarkItDown — 万能文件转 Markdown

微软官方（AutoGen 团队维护）的 Python 转换器：把 PDF、Word、PPT、Excel、图片、音频、HTML、EPUB 等几十种格式统一转成干净的 Markdown，输出面向 LLM 消费（保结构、省 token），而不是给人看的高保真排版还原。本技能为**文档层**：工具本体通过 PyPI 分发（`pip install` 即用），本地只保留使用文档与配套脚本，不含上游源码。

## 定位与适用场景

| 用它 | 不用它 |
| --- | --- |
| 批量把 Office/PDF/网页喂给 LLM 做分析、摘要、检索 | 需要人看的高保真版式还原（用专用 PDF 排版工具） |
| 提取 Word/PPT 里的表格、标题层级、备注 | 纯文本抽取后还要复杂后处理（直接写解析器） |
| 公式（OMML/LaTeX）、扫描件 OCR、图片 EXIF 转写 | 生成新图表（转交本仓库 `../../12_学术论文与科研图表/scientific-schematics`） |

安全前提：MarkItDown 以当前进程权限做 I/O，`convert()` 可以读本地路径、URL 与流。处理不可信输入时改用最窄的入口（`convert_local()` / `convert_stream()`），详见 [references/api_reference.md](references/api_reference.md)。

## 安装

Python ≥ 3.10，建议虚拟环境：

```bash
pip install 'markitdown[all]'        # 全格式支持
pip install 'markitdown[pdf,docx]'   # 只装需要的格式（extras 见下表）
```

## CLI 用法

```bash
markitdown file.pdf > out.md                 # 输出到 stdout
markitdown file.pdf -o out.md                # 输出到文件
cat file.pdf | markitdown                    # stdin 管道（用 -x 补扩展名提示）
markitdown file.bin -x pdf                   # 无法识别扩展名时显式提示
markitdown -v                                # 版本号

# 云端增强转换（二者互斥）
markitdown scan.pdf -d -e "<docintel_endpoint>"              # Azure Document Intelligence
markitdown video.mp4 --use-cu --cu-endpoint "<cu_endpoint>"  # Azure Content Understanding

# 插件
markitdown --list-plugins
markitdown file.pdf -p                       # 启用已装插件（如 markitdown-ocr）
```

全部旗标（`-m` MIME 提示、`-c` 字符集、`--keep-data-uris`、`--cu-analyzer`、`--cu-file-types`）见 [references/api_reference.md](references/api_reference.md) 的 CLI 对照表。

## Python API 速览

```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("document.pdf")     # 也接受 Path / URL / Response / 二进制流
print(result.markdown)                  # v0.1.x 推荐 .markdown（.text_content 为兼容别名）

# 流式输入
with open("document.pdf", "rb") as f:
    result = md.convert_stream(f)

# LLM 视觉描述（PPTX/图片），任意 OpenAI 兼容客户端
from openai import OpenAI
md_vision = MarkItDown(llm_client=OpenAI(), llm_model="gpt-4o",
                       llm_prompt="Describe this image in detail")
```

完整签名（`convert_local/convert_uri/convert_response`、`StreamInfo`、自定义转换器、插件开发、异常类型）见 [references/api_reference.md](references/api_reference.md)。

## 支持格式与 extras 对照

| 格式 | 转换器 | extras | 说明 |
| --- | --- | --- | --- |
| PDF | PdfConverter | `[pdf]` | pdfminer + pdfplumber；扫描件走 DocIntel/CU/OCR 插件 |
| Word (docx) | DocxConverter | `[docx]` | 标题/表格/OMML 公式；OMML 模板在 v0.1.7 修复 |
| PowerPoint (pptx) | PptxConverter | `[pptx]` | 幻灯片+备注+图表；v0.1.7 修复图表 O(n²) 与 SVG 回退 |
| Excel (xlsx/xls) | XlsxConverter/XlsConverter | `[xlsx]` / `[xls]` | 工作表转 Markdown 表 |
| 图片 (jpeg/png/…) | ImageConverter | `[all]` | EXIF 元数据 + 可选 LLM 描述；EXIF 取自 exiftool |
| 音频 (wav/mp3) | AudioConverter | `[audio-transcription]` | 元数据 + 语音转录 |
| Outlook (msg) | OutlookMsgConverter | `[outlook]` | 邮件正文与附件信息 |
| EPUB | EpubConverter | `[all]` | 全文抽取 |
| HTML | HtmlConverter | `[all]` | 清洗转换，支持 `text/markdown` 协商 |
| CSV / JSON / XML / 纯文本 | CsvConverter/PlainTextConverter | `[all]` | 结构化表示 |
| ipynb | IpynbConverter | `[all]` | Notebook 单元格 |
| ZIP 压缩包 | ZipConverter | `[all]` | 逐个转换内部文件 |
| RSS / Wikipedia / YouTube / Bing SERP | 对应专用转换器 | `[all]` / `[youtube-transcription]` | URL 直接传入 `convert()` |

每格式的依赖、能力边界与示例见 [references/file_formats.md](references/file_formats.md)。

## v0.1.7 要点（2026-07-29）

- **PPTX 图表转换 O(n²) 性能修复**：大图表转换明显提速。
- **PPTX SVG 图片**：无栅格化回退时不再失败。
- **公式转换修复**：mu/nu/tau/下箭头等 LaTeX 宏映射纠错；OMML 模板 bug 修复（Word 公式转 Markdown 更可靠）。
- **本次重写补齐的既有能力文档**（v0.1.5/v0.1.6 已合入、旧版本文档缺失）：`markitdown-ocr` 官方 OCR 插件、Azure Content Understanding 多模态云转换（`cu_endpoint`/`--use-cu`）、`convert_local/convert_uri/convert_response` 安全入口族。
- 结果对象新写法：`result.markdown`（`.text_content` 转为软弃用别名，旧代码不用改）。

## 本地脚本（自研配套）

| 脚本 | 用途 |
| --- | --- |
| [scripts/batch_convert.py](scripts/batch_convert.py) | 多线程批量转换目录下全部文件 |
| [scripts/convert_literature.py](scripts/convert_literature.py) | 文献 PDF 批量转 Markdown 并带来源元数据 |
| [scripts/convert_with_ai.py](scripts/convert_with_ai.py) | LLM 视觉描述增强转换（科学图/PPT，经 OpenRouter 等 OpenAI 兼容端点） |

三个脚本只依赖 `markitdown` 的稳定公开 API（`MarkItDown()` / `convert()` / `result.text_content`），v0.1.7 下可直接运行。

## 参考文档索引

- [references/api_reference.md](references/api_reference.md) — Python API 全签名、CLI 全旗标、StreamInfo、自定义转换器与插件开发
- [references/file_formats.md](references/file_formats.md) — 逐格式能力、依赖、限制与示例
- [references/cloud_and_plugins.md](references/cloud_and_plugins.md) — Azure Document Intelligence / Content Understanding、markitdown-ocr、MCP 服务器、Docker
- 上游仓库：<https://github.com/microsoft/markitdown>（tag `v0.1.7`）｜ PyPI：<https://pypi.org/project/markitdown/>
- 上游关键源码（定 tag 链接）：[主包 pyproject.toml](https://github.com/microsoft/markitdown/blob/v0.1.7/packages/markitdown/pyproject.toml)｜[转换器目录](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown/src/markitdown/converters)｜[OCR 插件](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown-ocr)｜[MCP 服务器](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown-mcp)
