# ru-listing-writer

Reusable Agent Skill for producing Russian marketplace titles and conversion-oriented descriptions from an ordered ecommerce image set, three keyword screenshots, and one competitor-title screenshot.

The skill preserves image-to-description selling-point order, applies WB/Wildberries and OZON capitalization rules, returns Chinese title and description translations, and validates character counts and bullet formatting.

## Repository contents

- `SKILL.md` — canonical Agent Skill instructions.
- `references/` — description structure guidance loaded when drafting.
- `scripts/` — deterministic character and formatting validators.
- `adapters/` — platform-specific installation and prompt guidance.

## Required user input

1. Three core-keyword screenshots.
2. One benchmark competitor-title screenshot from the target marketplace.
3. One complete ecommerce image set in its intended gallery order.
4. The target marketplace, such as WB/Wildberries or OZON.

## Codex installation

Copy this repository folder to the Codex skills directory so the final path is:

```text
~/.codex/skills/ru-listing-writer/SKILL.md
```

Invoke it with:

```text
$ru-listing-writer 请根据我上传的关键词截图、竞品标题截图和按顺序排列的电商套图生成俄文标题与描述。目标平台：WB。
```

## Claude Code installation

Copy or clone the folder to either a project skill location:

```text
<project>/.claude/skills/ru-listing-writer/
```

or a personal skill location:

```text
~/.claude/skills/ru-listing-writer/
```

See [Claude Code adapter](adapters/claude-code.md).

## WorkBuddy installation

Download the release asset `ru-listing-writer.zip`, open WorkBuddy's skill import dialog, and upload the ZIP. The archive contains `SKILL.md` at its root with the required YAML `name` and `description`, plus the referenced scripts and guidance. See [WorkBuddy adapter](adapters/workbuddy.md).

## Doubao / Coze installation

Download the release asset `ru-listing-writer.zip` and upload it through the platform's skill import dialog. The ZIP is packaged with `SKILL.md` at its root for direct import. See [Doubao/Coze adapter](adapters/doubao-coze.md).

If a particular product edition does not expose skill import, use the fallback prompt/knowledge-file method documented in the adapter.

## Validation

```text
python scripts/count_chars.py --text "俄文标题"
python scripts/validate_listing.py --title-file title.txt --description-file description.txt --expected-bullets 6 --require-black-dots --require-lowercase
```

Use `--require-lowercase` for WB descriptions. Omit it for OZON. Black-dot bullets use the exact prefix `• `.

## License

MIT
