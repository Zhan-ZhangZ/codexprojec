---
name: invoice2data
description: 基于正则模板与高精 OCR 的工业级发票收据提取、分类与归档中枢 (invoice2data)。以轻量化的规则引擎覆盖主流报销单据，实现 PDF/图像层自动化切片提取，提供无缝对接企业 ERP 系统的高效通道。Leading Words: 工业级规则发票提取, 高精OCR报销单据切片, PDF账单自动化归类中枢, 企业ERP无缝对接通道
metadata:
  upstream: github.com/invoice-x/invoice2data
  version: "1.0.1"
---

# 💼 invoice2data 发票提取与归档技能 (v1.0.1)

发票 PDF/图片 → 结构化数据（JSON/CSV/XML）的模板驱动提取工具。上游以 PyPI 发行（`pip install invoice2data`），本技能本地只保留**文档层 + 内置发票模板库**；运行时一律通过 pip 安装上游发行版。

## 1. 核心法则 (Golden Rules)
- **了解指令**：执行任何提取/归档操作前，先用 `view_file` 阅读本目录 `README.md` 掌握权威用法；CLI 全参数见 `docs/usage.md`。
- **不污染原文件**：重命名与归档操作使用 `--copy`（或先复制），确保原始发票可回滚。
- **模板匹配优先**：优先依赖内置/自定义 YAML 模板匹配；无匹配时先用模板生成器起草（`--new-template`），最后才考虑 AI 回退（`--ai-fallback`）。
- **本地无源码**：本目录不含 Python 源码（src/tests 已剔除），不要尝试在本目录内直接 `import invoice2data` 运行开发版；先 `pip install invoice2data`。

## 2. 安装 (pip)
```bash
pip install invoice2data                    # 默认即含 pdfium 后端，无系统依赖
pip install "invoice2data[ai]"              # LLM 模板生成 / AI 回退提取
pip install "invoice2data[camelot]"         # 表格提取插件
pip install "invoice2data[paddleocr]"       # 本地深度学习 OCR
```
更多可选后端（pdfplumber、doctr、googlevision、ocrmypdf/tesseract 系统依赖等）按 `docs/installation.md` 核对安装。

## 3. 轨迹驱动执行引擎 (Execution Trajectory)
1. **输入阶段 (Initialization)**
   - 确定发票所在目录/文件与目标归档路径、重命名格式。
   - 环境无 `invoice2data` 命令时先按第 2 节安装。
2. **提取阶段 (Extraction)**
   - CLI：`invoice2data *.pdf`（默认输出 CSV）；`--output-format json|xml` 切换格式；`--output-name -` 流式输出到 stdout 供管道消费；`--input-reader` 强制指定文本后端（pdfium 默认 / pdftotext / tesseract / ocrmypdf / paddleocr 等）。
   - Python 库：`from invoice2data import extract_data` → `extract_data("invoice.pdf")`；自带模板外传时 `from invoice2data.extract.loader import read_templates` 后 `extract_data(filename, templates=templates)`；库层公共 API 另见 `invoice2data.api`（v1.0.1 起自 `__main__` 拆出）。
   - 提示：v1.0 起提取失败/无模板匹配返回空字典 `{}`（不再抛异常），类型化异常 `NoTemplateFoundError` / `RequiredFieldsMissingError` 为可选开启。
3. **归档阶段 (Archiving)**
   - `invoice2data --copy 归档目录 发票目录/*.pdf`：按提取结果（供应商/日期/编号等）重命名并归档副本；`--move` 为移动。
   - 归档目录结构建议按月或按供应商组织，重命名模板可包含提取字段。
4. **输出验证 (Verification)**
   - 抽查归档文件名与结构化数据一致性；`--debug` 排查误提取。
   - 生成提取简要报告（数量、成功/失败清单）。

## 4. 模板机制 (Templates)
- **模板即核心**：YAML/JSON 正则模板定义字段抽取规则（issuer/amount/date/invoice_number/currency/lines 行项目等），推荐字段清单见 `docs/recommended-template-fields.md`。
- **内置模板库**：本目录 `templates/` 收录上游全部内置模板（`au/be/ch/com/de/es/fr/nl/pl` 9 组共 215 个 YAML），与 pip 安装后包内自带模板同源；既可作编写参考，也可复制后作为自定义模板库起点。
- **自定义模板**：`--template-folder 我的模板目录` 追加加载；`--exclude-built-in-templates --template-folder ...` 只用自有模板。
- **模板生成**：`invoice2data --new-template sample.pdf` 从样票起草模板（交互式加 `--interactive`，配置 LLM 后加 `--ai`）；编写 DSL 全教程见 `docs/tutorial.md`，常见坑见 `docs/cookbook.md`。

## 5. 异常处理模式
- **依赖缺失**：`invoice2data` 命令不存在 → 先 `pip install invoice2data`；OCR 后端报缺系统依赖 → 按 `docs/installation.md` 安装对应 extras/系统包。
- **解析失败（结果为空 `{}`）**：无匹配模板 → 用 `--new-template` 针对该票种补模板，或改用大模型直接抽取；多页行项目、货币符号等已知坑先查 `docs/cookbook.md`。
- **提取字段可疑**：`invoice2data --debug` 输出完整匹配过程定位正则问题；自动化流水线用 `--in-automation --output-format json --output-name -` 获取机器可读日志。
- **从旧版升级**：0.x → 1.x 行为差异（空结果、静态解析器、异常开关等）见 `docs/migration-1.0.md`。

## 6. 引用索引 (Reference Index)
| 文档 | 内容 |
| --- | --- |
| `README.md` | 项目总览、快速上手、特性清单（入口必读） |
| `docs/quickstart.md` | 五分钟上手：安装 → 首次提取 → 第一个模板 |
| `docs/installation.md` | 安装、可选后端与 extras 对照表 |
| `docs/usage.md` | CLI 全参数参考与常见任务 |
| `docs/tutorial.md` | 模板编写 DSL 全教程 |
| `docs/recommended-template-fields.md` | 推荐字段规范与 UNECE 单位规范化 |
| `docs/how-it-works.md` | 提取管线与后端级联原理 |
| `docs/cookbook.md` | 实战菜谱：多页行项目、货币符号、DB 存模板、类型化错误 |
| `docs/reference.md` | Python API 参考 |
| `docs/ai.md` | AI 模板草拟与回退提取配置（`INVOICE2DATA_AI_*`） |
| `docs/backend-benchmark.md` | 文本后端基准对比 |
| `docs/faq.md` | FAQ 与同类工具对比 |
| `docs/migration-1.0.md` | 0.x → 1.x 迁移指南 |
| `docs/index.md` | 文档导航目录 |
| `docs/license.md` / `LICENSE.md` | 许可证（MIT） |
| `templates/` | 内置发票模板库（9 组 215 个 YAML，运行时核心资产） |
