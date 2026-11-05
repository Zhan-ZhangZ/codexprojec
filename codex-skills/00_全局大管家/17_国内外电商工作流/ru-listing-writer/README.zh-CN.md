# ru-listing-writer

可复用的 Agent Skill：根据一组有明确顺序的电商商品图、三张关键词截图和一张竞品标题截图，生成俄罗斯市场商品标题与面向转化的描述。

该技能保留“图片到描述”的卖点顺序，应用 Wildberries 与 OZON 的首字母大小写规则，返回标题和描述的中文翻译，并校验字符数与项目符号格式。

## 仓库内容

- `SKILL.md`：标准 Agent Skill 指令。
- `references/`：撰写描述时按需加载的结构指导。
- `scripts/`：确定性的字符数和格式校验脚本。
- `adapters/`：各平台的安装说明和提示词适配。

## 必需输入

1. 三张核心关键词截图。
2. 一张目标市场竞品标题截图。
3. 一套完整、按预期展示顺序排列的电商商品图。
4. 目标市场，例如 WB/Wildberries 或 OZON。

## Codex 安装

把本仓库目录复制到 Codex 的 skills 目录，使最终路径为：

```text
~/.codex/skills/ru-listing-writer/SKILL.md
```

调用方式：

```text
$ru-listing-writer 请根据我上传的关键词截图、竞品标题截图和按顺序排列的电商套图生成俄文标题与描述。目标平台：WB。
```

## Claude Code 安装

把本目录克隆或复制到项目级或用户级技能目录：

```text
<project>/.claude/skills/ru-listing-writer/
```

或：

```text
~/.claude/skills/ru-listing-writer/
```

详细说明见 [Claude Code 适配器](adapters/claude-code.md)。

## WorkBuddy 安装

从 Release 下载 `ru-listing-writer.zip`，打开 WorkBuddy 的技能导入对话框并上传。

压缩包根目录包含带 YAML `name` 和 `description` 的 `SKILL.md`，以及该技能引用的脚本和指导文件。

详细说明见 [WorkBuddy 适配器](adapters/workbuddy.md)。

## 豆包 / Coze 安装

从 Release 下载 `ru-listing-writer.zip`，通过平台的技能导入对话框上传。

压缩包为直接导入而构建，根目录包含 `SKILL.md`。

如果某个产品版本没有技能导入入口，请使用适配器中记录的后备提示词/知识文件方案。

详细说明见 [豆包/Coze 适配器](adapters/doubao-coze.md)。

## 校验

```text
python scripts/count_chars.py --text "俄文标题"
python scripts/validate_listing.py --title-file title.txt --description-file description.txt --expected-bullets 6 --require-black-dots --require-lowercase
```

WB 描述使用 `--require-lowercase`。OZON 不使用该参数。黑点项目符号必须使用精确前缀 `• `。

## 许可证

[MIT](LICENSE)
