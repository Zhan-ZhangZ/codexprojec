---
name: spreadsheet-formula-helper
description: 极客级电子表格函数大师与跨方言调试专家。精通 Excel 与 Google Sheets 之间的公式翻译。自动编写嵌套数组公式、复杂数据透视表规则，并生成带边界用例（Edge-case checks）的数据验证测试台。Leading Words: 嵌套数组公式调试, 复杂数据透视表, Excel与Sheets方言翻译, 表格边界用例测试
metadata:
  short-description: Build/debug Excel or Sheets formulas
---

# Spreadsheet Formula Helper

Produce reliable spreadsheet formulas with explanations.

## Inputs to gather
- Platform (Excel/Sheets), locale (comma vs. semicolon separators), sample data layout (headers, ranges), expected outputs, and constraints (volatile functions allowed?).
- Provide small example rows and the desired result for them.

## Workflow
1) Restate the problem with explicit ranges and sheet names; propose a minimal sample to verify.
2) Draft formula(s); when dynamic arrays are available, prefer them over copy-down formulas.
3) Explain how it works and where to place it; include named ranges if helpful.
4) Edge cases: blank rows, mixed types, timezone/date quirks, duplicates; offer guardrails (e.g., `IFERROR`, `LET`, `LAMBDA`).
5) Variants: if porting between Excel and Sheets, provide both versions.

## Output
- Primary formula, short explanation, and a 2–3 row worked example showing inputs → outputs.
- Optional: quick troubleshooting checklist for common errors.
