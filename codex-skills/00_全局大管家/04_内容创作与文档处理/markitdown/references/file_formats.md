# 支持格式详解（对应上游 v0.1.7）

> 来源：[converters/](https://github.com/microsoft/markitdown/tree/v0.1.7/packages/markitdown/src/markitdown/converters) 各转换器源码与[主 README](https://github.com/microsoft/markitdown/blob/v0.1.7/README.md)。安装缺失 extras 后重试即可解决大部分 `MissingDependencyException`。

## Office 文档

### Word（.docx）— `DocxConverter`，extras `[docx]`

- 保留标题层级、列表、表格、超链接；OMML 公式转 LaTeX（v0.1.7 修复了 mu/nu/tau/下箭头宏映射与 OMML 模板 bug）。
- 样式映射：`MarkItDown(style_map="p[style-name='Title'] => h1:fresh")`。

```python
md = MarkItDown()
print(md.convert("报告.docx").markdown)
```

### PowerPoint（.pptx）— `PptxConverter`，extras `[pptx]`

- 每张幻灯片一节，含备注；图表转 Markdown 表（v0.1.7 修复图表值查找 O(n²) 性能问题）。
- 内嵌图片可配 LLM 视觉描述（`llm_client`/`llm_model`）；SVG 图片无栅格化回退时不再失败（v0.1.7）。

### Excel（.xlsx / .xls）— `XlsxConverter` / `XlsConverter`，extras `[xlsx]` / `[xls]`

- 每个工作表一节，转 Markdown 表格；适合喂 LLM 做数据分析，不适合保留公式与格式。

## PDF

### 本地离线 — `PdfConverter`，extras `[pdf]`

- 依赖 `pdfminer.six>=20251230` + `pdfplumber>=0.11.9`；pdfplumber 抽取对齐表格，失败时自动回退 pdfminer 纯文本。
- 局限：复杂版式不保真；纯扫描件（图片型 PDF）无文字层，需走下述三种增强路径之一。

```python
print(md.convert("paper.pdf").markdown)
```

### 扫描件 / 嵌入图文字的三条增强路径

| 路径 | 依赖 | 适用 |
| --- | --- | --- |
| Azure Document Intelligence | `pip install 'markitdown[az-doc-intel]'` + DI 资源 | 云端版式分析，PDF 专用，见 [cloud_and_plugins.md](cloud_and_plugins.md) |
| Azure Content Understanding | `pip install 'markitdown[az-content-understanding]'` + CU 资源 | 云端多模态（含音视频）+ 结构化字段抽取 |
| markitdown-ocr 插件 | `pip install markitdown-ocr` + 任意 LLM 视觉端点 | PDF/DOCX/PPTX/XLSX 内嵌图 + 扫描页整页 OCR，见 [cloud_and_plugins.md](cloud_and_plugins.md) |

## 图片（.jpeg/.png/.gif/.webp 等）— `ImageConverter`

- 无 extras 要求（`[all]` 已含）；EXIF 元数据需系统装有 **exiftool**（`brew install exiftool` / `apt install exiftool`，或 `MarkItDown(exiftool_path=...)`）。
- 配 `llm_client` + `llm_model` 时输出 LLM 视觉描述，可自定义 `llm_prompt`。

## 音频（.wav/.mp3，及 .mp4/.m4a 容器）— `AudioConverter`，extras `[audio-transcription]`

- 依赖 pydub + SpeechRecognition；先写元数据（时长、声道），再尝试语音转录。转录引擎为本地 Google Speech API 兼容调用，无云凭据需求。

## 网页与在线资源

| 类型 | 转换器 | extras | 说明 |
| --- | --- | --- | --- |
| HTML | `HtmlConverter` | `[all]` | 清洗为 Markdown；服务器支持 `text/markdown` 时按内容协商直取 |
| RSS/Atom | `RssConverter` | `[all]` | feed URL 直接传入 |
| Wikipedia | `WikipediaConverter` | `[all]` | 词条正文清洗 |
| Bing 搜索结果页 | `BingSerpConverter` | `[all]` | SERP 转结构化列表 |
| YouTube | `YouTubeConverter` | `[all]`（转录需 `[youtube-transcription]`） | 标题+描述+字幕；仅支持 `https://www.youtube.com/watch?` 形态 URL |

## 数据与容器格式

| 类型 | 转换器 | extras | 说明 |
| --- | --- | --- | --- |
| CSV | `CsvConverter` | `[all]` | Markdown 表 |
| JSON / XML / 纯文本 / 代码 | `PlainTextConverter` | `[all]` | 通用兜底（优先级最低） |
| Jupyter Notebook | `IpynbConverter` | `[all]` | 单元格含代码与输出 |
| Outlook 邮件 | `OutlookMsgConverter` | `[outlook]` | .msg 正文与元数据 |
| EPUB | `EpubConverter` | `[all]` | 全文抽取 |
| ZIP 压缩包 | `ZipConverter` | `[all]` | 逐文件递归转换内部内容 |

## 排障速查

1. **`MissingDependencyException`** → 补装 extras：`pip install 'markitdown[pdf]'`。
2. **`UnsupportedFormatException`** → 扩展名不可识别；stdin/改后缀文件用 `-x` 或 `StreamInfo(extension=...)` 提示。
3. **图片无 EXIF** → 装 exiftool 或指定 `exiftool_path`。
4. **data URI 被截断** → CLI 加 `--keep-data-uris`（或 `convert(..., keep_data_uris=True)`）。
5. **扫描 PDF 输出为空** → 无文字层，改走 DocIntel / CU / markitdown-ocr 三条增强路径。
