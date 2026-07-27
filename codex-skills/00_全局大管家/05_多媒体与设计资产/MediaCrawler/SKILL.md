---
name: mediacrawler
description: 全矩阵跨平台社交媒体高匿爬虫引擎 (MediaCrawler)。采用 Playwright 挂载、扫码 / Cookie 会话保持，成功规避小红书、抖音、B站等平台的严厉风控反爬策略，合法合规提取帖子及评论区舆情。Leading Words: 全矩阵社交媒体爬虫, Playwright防反爬绕过, 评论区舆情提取, 小红书抖音帖子抓取
---

# MediaCrawler 高匿爬虫引擎 (Skill Guide)

本技能封装了开源跨平台社交媒体爬虫（MediaCrawler），用于合规规避平台风控并提取推文、视频、评论及创作者等全量数据。

## ⚠️ 核心法则 (Golden Rules)

> **【强制前置要求】** 
> 执行任何抓取操作前，Agent **必须首先调用 `view_file` 工具完整阅读本项目根目录下的 `README.md` 文档**。
> 
> **绝对禁止**在不阅读 README 的情况下凭空猜测 `main.py` 的运行参数和配置。所有的具体启动指令、支持平台列表（如 xhs, dy）、抓取类型、登录方式（qrcode, cookie等）和文件导出参数，**均以 `README.md` 为唯一真理来源**。

## ⚙️ 轨迹驱动执行引擎 (Execution Trajectory)

### State 1: 知识装载 (Read Docs)
- 立刻通过 `view_file` 查阅 `README.md`，了解当前项目支持的具体命令行参数。

### State 2: 预检与环境构建 (Env Setup)
- 检查运行环境是否就绪（Python 3、`requirements.txt`、`playwright` 内核）。
- **优化点**：如果出现依赖安装缓慢或因旧版本死锁导致编译报错（如 `matplotlib` 或 `pydantic-core` 报 C/Rust 错），请自动解除 `requirements.txt` 中的版本锁定号，并采用国内高速镜像源（清华 pip 源、阿里 Playwright 镜像）重试。

### State 3: 命令组装与执行 (Execute Crawler)
- 基于 README 中的示例与用户提供的关键词/账号ID，拼装启动命令（推荐使用 `--lt qrcode` 扫码模式）。
- **必须将其放入后台任务中运行 (`run_command` 的 `WaitMsBeforeAsync` 参数配置足够时长)**，并提示用户等待终端中的扫码步骤。

### State 4: 数据交付 (Data Delivery)
- 抓取完成后，自动检索 `data/` 目录中生成的导出文件（如 `jsonl`、`csv`）。向用户汇报抓取的条数，并做基础的数据清洗或摘要总结。

## 🛡️ 异常处理模式
1. **反爬滑块/封禁拦截**：若日志提示出现安全滑块或账户风控限制，请立即向用户汇报，建议用户使用干净的“小号”再次扫码或更换网络环境。
2. **目标不存在或无数据**：若抓取结果为空，请提示用户检查该关键词/ID 在平台上是否因违规被屏蔽。
