# QuantDinger i18n 工具

补齐 `QuantDinger-Vue-src/src/locales/lang/*.js` 多语言文件缺失 key 的工具链。

## 当前缺失情况

以 `zh-CN` 为基准(4240 keys):

| 语言      | 现存 keys | 缺失 | 备注 |
| --------- | --------- | ---- | ---- |
| zh-CN     | 4240      | 0    | 基准 |
| en-US     | 4426      | 72   | 几乎完整(另有 258 个基准里没有的 key) |
| zh-TW     | 3741      | 500  | |
| ar-SA / de-DE / fr-FR / ja-JP / ko-KR / th-TH | ~2030 | ~2530 | |
| vi-VN     | 1759      | 2558 | 最残 |

## 使用步骤

### 1. 分析(免费,不调 AI)

```bash
node scripts/i18n-diff.js            # 统计各语言缺失数量
node scripts/i18n-diff.js --detail   # 列出每种语言前 50 个缺失 key
```

### 2. AI 全自动翻译

**首选 provider: Anthropic(Claude 3.5 Haiku,便宜且翻译质量好)**

PowerShell(Windows):

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."

# 先 dry-run 验证(不改文件,只跑 1 个小批次)
node scripts/i18n-fill-ai.js --lang=ja-JP --batch=20 --dry-run

# 正式跑单语言
node scripts/i18n-fill-ai.js --lang=ja-JP

# 一次跑完所有语言(推荐,约 10-20 分钟)
node scripts/i18n-fill-ai.js --all
```

CMD:

```cmd
set ANTHROPIC_API_KEY=sk-ant-...
node scripts/i18n-fill-ai.js --all
```

Bash / Git Bash:

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/i18n-fill-ai.js --all
```

### 3. 换 Provider

```bash
# OpenAI (gpt-4o-mini)
set OPENAI_API_KEY=sk-...
node scripts/i18n-fill-ai.js --all --provider=openai

# DeepSeek (超便宜,deepseek-chat)
set DEEPSEEK_API_KEY=sk-...
node scripts/i18n-fill-ai.js --all --provider=deepseek

# OpenRouter (一个 key 打所有模型)
set OPENROUTER_API_KEY=sk-or-...
node scripts/i18n-fill-ai.js --all --provider=openrouter --model=anthropic/claude-3.5-haiku
```

### 4. 全部参数

```
--lang=xx-YY        目标语言(或用 --all)
--all               处理 ar-SA / de-DE / fr-FR / ja-JP / ko-KR / th-TH / vi-VN / zh-TW
--provider=...      anthropic(默认) / openai / deepseek / openrouter
--model=...         覆盖默认模型
--batch=N           每次请求翻译的 key 数(默认 80,建议 50-100)
--concurrency=N     并发批次数(默认 3,提速可设 5-8)
--dry-run           只预览不写文件
--no-cache          强制重新翻译(默认会从 scripts/.i18n-cache 读缓存)
--retry=N           单批失败重试次数(默认 3)
```

## 工具特性

### 安全

- 写入前会把原文件备份到 `<lang>.js.bak`(已加进 .gitignore)
- 翻译结果缓存到 `scripts/.i18n-cache/<lang>.json`,中断后重跑只续翻未完成部分
- 只在文件尾部 `const locale = { ... }` 内追加新 key,**不会动现有 key 和注释**
- 只填充 `missing = (zh-CN ∪ en-US 的 keys) - 目标语言已有`,不会改写目标语言已有翻译

### 成本估算(仅供参考)

| Provider | 模型 | 翻译约 16000 条(全部 8 种语言)预估费用 |
| -------- | ---- | ---- |
| Anthropic | claude-3-5-haiku-latest | ~¥10-15 |
| OpenAI | gpt-4o-mini | ~¥5-10 |
| DeepSeek | deepseek-chat | ~¥1-3 |
| OpenRouter | anthropic/claude-3.5-haiku | 同 Anthropic |

### 质量提示

- Prompt 已内置金融/加密货币术语约束(BTC/USDT/OKX 等专有名词不翻)
- 占位符 `{count}`、`%d`、`%s`、`\n` 明确要求保留
- 对 zh-TW 会触发「简转繁 + 换台湾术语」(如 软件→軟體、网络→網路)

## 工作流

推荐先 dry-run 一个语言看一批翻译效果,满意后再 `--all`:

```bash
# 1. 看看会翻成什么样
$env:ANTHROPIC_API_KEY="sk-ant-..."
node scripts/i18n-fill-ai.js --lang=ja-JP --batch=20 --dry-run

# 2. 查看生成的缓存样本
type scripts\.i18n-cache\ja-JP.json | more

# 3. 满意后真跑
node scripts/i18n-fill-ai.js --all

# 4. 验证
node scripts/i18n-diff.js
```

## 回滚

每次运行会在目标文件旁生成 `.bak` 原文件备份。如果翻译不理想:

```bash
# 单个文件回滚
copy QuantDinger-Vue-src\src\locales\lang\ja-JP.js.bak QuantDinger-Vue-src\src\locales\lang\ja-JP.js

# 全部回滚
for %f in (QuantDinger-Vue-src\src\locales\lang\*.bak) do copy "%f" "%~dpnf"
```

跑完满意后:

```bash
# 删除所有 .bak
del QuantDinger-Vue-src\src\locales\lang\*.bak
# 删除缓存
rmdir /s /q scripts\.i18n-cache
```
