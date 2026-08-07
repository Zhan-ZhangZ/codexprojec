# qiaomu-libgen-downloader

> Search and download ebooks from LibGen.li mirror — zero dependencies, just Python + curl.
> 从 LibGen.li 镜像站搜索和下载电子书 — 零依赖，只需 Python + curl。

**[English](#english) | [中文](#中文)**

---

<a name="english"></a>
## English

### What it does

Searches [LibGen.li](https://libgen.li) for ebooks and downloads them automatically. Built as a Claude Code Skill — ask your AI to "download this book from LibGen" and it handles the rest.

### Prerequisites

- [ ] **Python 3** — pre-installed on macOS/Linux. Verify: `python3 --version`
- [ ] **curl** — pre-installed on macOS/Linux. Verify: `curl --version`
- [ ] **Claude Code** — [install guide](https://docs.anthropic.com/en/docs/claude-code)

No pip packages needed. Uses only Python standard library + system curl.

### Install

```bash
npx skills add joeseesun/qiaomu-libgen-downloader
```

### Usage Examples

Ask Claude Code in natural language:

- "Download *Structures: Or Why Things Don't Fall Down* from LibGen"
- "用libgen下载《三体》" (Chinese works too)
- "Search for *Dune* on LibGen, just list results"

Or run the script directly:

```bash
# Search and download
python3 ~/.claude/skills/qiaomu-libgen-downloader/scripts/download.py "Dune Frank Herbert" -o ~/Downloads/

# List results only
python3 ~/.claude/skills/qiaomu-libgen-downloader/scripts/download.py "Dune" --list
```

### How It Works

1. Searches `libgen.li` with your query
2. Parses MD5 hashes from search results
3. Resolves download links via the ads page
4. Downloads the file (validates > 10KB)
5. Retries up to 3 results if download fails

### Acknowledgments

Built on the [Library Genesis](https://libgen.li/) project, a free ebook repository.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "No search results" | Try adding the author name: `"Book Title Author Name"` |
| Download times out | Check your network can reach `libgen.li`; retry in a few seconds |
| File too small / corrupt | The script auto-retries the next result; if all fail, try a different query |
| `libgen.is` blocked | This skill uses `libgen.li` specifically, which is more accessible |

---

<a name="中文"></a>
## 中文

### 功能

从 [LibGen.li](https://libgen.li) 镜像站搜索和下载电子书。作为 Claude Code Skill 开发 — 对 AI 说"从libgen下载这本书"即可自动完成。

### 前置条件

- [ ] **Python 3** — macOS/Linux 自带。验证：`python3 --version`
- [ ] **curl** — macOS/Linux 自带。验证：`curl --version`
- [ ] **Claude Code** — [安装指南](https://docs.anthropic.com/en/docs/claude-code)

无需 pip 安装任何包，纯 Python 标准库 + 系统 curl。

### 安装

```bash
npx skills add joeseesun/qiaomu-libgen-downloader
```

### 使用示例

直接对 Claude Code 说：

- "从libgen下载《三体》"
- "用libgen搜索 Dune"
- "帮我用libgen抓取 Structures Or Why Things Don't Fall Down"

或直接运行脚本：

```bash
# 搜索并下载
python3 ~/.claude/skills/qiaomu-libgen-downloader/scripts/download.py "三体 刘慈欣" -o ~/Downloads/

# 只搜索不下载
python3 ~/.claude/skills/qiaomu-libgen-downloader/scripts/download.py "三体" --list
```

### 工作原理

1. 用关键词搜索 `libgen.li`
2. 从搜索结果解析 MD5 哈希
3. 通过 ads 页面获取下载链接
4. 下载文件并验证大小（> 10KB）
5. 最多重试 3 个结果

### 致谢

基于 [Library Genesis](https://libgen.li/) 项目，一个免费的电子书资源库。

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| "无搜索结果" | 加上作者名搜索：`"书名 作者"` |
| 下载超时 | 检查网络能否访问 `libgen.li`；稍后重试 |
| 文件太小/损坏 | 脚本会自动重试下一个结果；全部失败则换关键词 |
| `libgen.is` 被墙 | 本 skill 专门使用 `libgen.li`，可用性更好 |

## License

MIT
