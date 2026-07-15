---
name: moore-wechat-article-downloader
description: "Moore 系微信内容情报库归档器。将微信公众号文章、评论和互动数据本地化为可搜索、可分析的资料库。支持历史订阅同步与微信收藏快照抓取。专供大模型做深度内容研究与选题拆解。Leading Words: 微信公众号文章下载, 本地内容情报库, 微信历史文章同步, 评论互动数据归档"
---

# 微信内容情报库 Skill 指南

## 1. 核心法则 (Golden Rules)
* **强制前置阅读**：在执行具体命令前，**必须**使用 `view_file` 阅读该项目根目录的 `README.md`，以及 `references/` 下的架构说明，以掌握微信历史同步、代理增强抓取和订阅库的具体 CLI 命令格式。
* **隔离与隐私**：绝不打印 auth-key、cookie、token 等敏感凭证到聊天界面。
* **不做额外处理**：该技能专注于数据的采集、清洗与本地化落盘，绝对**不要**自行将其扩展为内容总结、AI 改写或云端 SaaS 接口。

## 2. 轨迹驱动执行引擎 (Execution Trajectory)
当你被要求使用 `moore-wechat-article-downloader` 进行下载或同步时，必须严格按照以下状态机轨迹执行：

* **[State: 意图分析与寻址]**
  * 使用 `view_file` 阅读 `README.md`，明确当前适合的场景（场景 1 直接下载；场景 2A Exporter 历史同步；场景 2C 微信增强快照等）。
  * 识别用户需求是否包含“精选评论 / 互动数据”，以决定是否调用代理增强流程。
* **[State: 工具链调用]**
  * 严格遵循 `README.md` 中指定的 `scripts/wechat_wizard.py` 统一入口执行任务。
  * 根据场景构建命令，例如：`python3 scripts/wechat_wizard.py run "获取公众号「名称」的历史文章"`。
* **[State: 中间态反馈机制]**
  * 当后端脚本返回 `need_login`、`need_account_choice` 或 `need_article_choice` 的 Gate 时，必须中断当前自动循环，将选项抛给用户确认。
  * 若为历史文章查询，**强制要求在聊天中罗列 `YYYY-MM-DD：文章标题` 供用户挑选**，禁止擅自全量盲目下载。
* **[State: 落盘验证与结果输出]**
  * 任务完成后，检查对应的输出目录与 Markdown 文件，并向用户报告：执行模式、成功数、失败数、文件保存路径。

## 3. 异常处理模式 (Exception Handling)
* **凭证过期 / 未授权**：当遭遇 `need_login` 时，立即停手，引导用户按照 README 要求扫码验证，或配置 Keychain Auth Key，严禁重试盲目爬取。
* **系统环境异常 (Missing Dependency)**：如果发现缺少相关的 Python 包环境，需向用户提出 `pip install` 建议，并获取明确同意后执行。
* **数据残缺 / 缺失评论**：明确告知用户部分历史数据抓取接口无法天然获取评论。如需评论与互动数据，引导用户启动 **2C 微信收藏代理会话**。
