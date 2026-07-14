# StatsPAI Output DOCX/XLSX Hardening Worklog

Date started: 2026-06-19

## Scope

Improve the `statspai.output` Word/Excel export stack without touching the
active JOSS review lane.

Included:

- `src/statspai/output/**`
- Output-focused tests under `tests/`
- This progress note under `plans/`

Excluded unless explicitly requested:

- `Paper-JSS/`
- `CausalAgentBench/`
- `paper.md`
- `paper.bib`
- `docs/joss_*`
- manuscript package snapshots, release metadata, or unrelated estimator logic

## Completion Criteria

- Single-table and multi-table DOCX/XLSX exports share the same style helpers
  where practical.
- Word and Excel exports preserve journal-style rules, notes, stars, spanners,
  and sheet behavior.
- Focused export tests pass.
- `git diff --check` passes.
- Root and nested repository status checks show no accidental review-lane edits.
- Final handoff explicitly asks the user to review and accept the full result.

## Batch 1: Shared Excel Path For Multi-Table Writers

Problem:

- `regtable`, `sumstats`, and `mean_comparison` already used shared Excel
  styling helpers.
- `paper_tables.to_xlsx` and `Collection.to_xlsx` still hand-rolled workbook
  borders, fonts, notes, and column widths.

Change:

- Added `safe_sheet_name()` to centralize Excel sheet-name truncation,
  invalid-character replacement, and collision handling.
- Added `render_dataframe_to_sheet()` so multi-sheet writers can render into
  an existing workbook while reusing the same Times/book-tab/MultiIndex/notes
  logic as single-sheet writers.
- Migrated `PaperTables.to_xlsx()` and `Collection.to_xlsx()` to the shared
  worksheet renderer.
- Removed the now-unused legacy collection worksheet writer.

Planned verification:

```bash
.venv/bin/python -m pytest \
  tests/test_excel_style_helpers.py \
  tests/test_paper_tables_export.py \
  tests/test_collection.py \
  tests/test_aer_word_style.py \
  tests/test_multi_se.py::test_multi_se_appears_in_excel \
  -q

git diff --check
git status --short --branch --untracked-files=all
git -C Paper-JSS status --short --branch --untracked-files=all
git -C CausalAgentBench status --short --branch --untracked-files=all
```

## Batch 2: Shared Word Table Renderer

Problem:

- `sumstats`, `mean_comparison`, `paper_tables`, and `Collection` each
  hand-built DataFrame-backed Word tables.
- The repeated paths made it too easy for notes, missing-value handling,
  table alignment, and book-tab borders to drift across `.docx` writers.

Change:

- Added `render_dataframe_to_word_table()` in `_aer_style.py`.
- Migrated `sumstats`, `MeanComparisonResult.to_word()`,
  `PaperTables.to_docx()`, and `Collection.to_docx()` to that helper.
- Preserved caller-specific document headings, centered panel titles, and
  page-break behavior while centralizing table body rendering.
- Kept `RegtableResult.to_word()` on its specialized path because it has
  column spanners and multi-row headers, but reused the same lower-level
  typography/book-tab primitives.

Tests added:

- Helper-level Word renderer coverage for index labels, missing values,
  notes, and three-rule book-tabs.
- Public API checks that `paper_tables.to_docx()` and `collect().save(.docx)`
  preserve standard/user notes.
- A `mean_comparison(..., fmt=...)` Word regression test to lock display
  formatting.

## Batch 3: Footer And Balance XLSX Consistency

Problem:

- Regression footnotes were reconstructed separately in `regtable`,
  `paper_tables`, and `collect`, and Excel omitted the eform footnote even
  though Word/text included it.
- Balance/mean-comparison Excel exports rendered raw float strings instead
  of respecting the user-facing `fmt`.

Change:

- Added `RegtableResult._footer_note_lines()` as the canonical footer source
  for Word/Excel bundle exports.
- Switched `RegtableResult.to_excel()`, `RegtableResult.to_word()`,
  `PaperTables.to_docx()`, `PaperTables.to_xlsx()`, and collection
  regtable branches to that shared footer.
- Added `MeanComparisonResult._formatted_dataframe()` and reused it in
  direct Word/Excel export and collection balance Word/Excel export.
- Added balance star notes to direct mean-comparison Excel export and
  collection balance workbook sheets.

Tests added:

- `regtable(eform=True).to_excel()` now checks that the eform footer note is
  present.
- Collection balance XLSX now checks both the star note and requested numeric
  format.

## Batch 4: Publication Worksheet Defaults

Problem:

- Workbook exports had journal-style cell formatting, but the sheet view and
  print/PDF setup still behaved like raw spreadsheet dumps.
- Bare string notes were easy to accidentally iterate character by character
  when callers used the lower-level worksheet helper directly.

Change:

- Added normalized note handling for Excel helpers so callers can pass either
  a single note string or a list of note lines.
- Applied publication worksheet defaults from the shared renderer: hide
  gridlines, freeze the row-label/header area, repeat header rows for printing,
  set the print area, fit to one page wide, choose page orientation from table
  width, and apply stable margins.

Tests added:

- Helper-level XLSX coverage now checks string notes, freeze panes, repeated
  print-title rows, fit-to-page setup, orientation, print area, margins, and
  duplicate sheet-name suffixing.

## Batch 5: Word Document Defaults And Public API Coverage

Problem:

- Word tables had book-tab borders, but generated documents still inherited
  Word's default heading/font/margin choices in several paths.
- `tab(..., output=".xlsx/.docx")` had the same table borders as other output
  writers, but not the new publication worksheet/document defaults.
- Helper tests alone were not enough to prove users saw the defaults through
  real export calls.

Change:

- Added `apply_word_document_defaults()` to set one-inch margins, Times New
  Roman normal/heading styles, black headings, compact spacing, and stable
  OOXML font slots.
- Applied document defaults to `regtable`, `sumstats`, `mean_comparison`,
  `paper_tables`, `collect`, and `tab` Word exports.
- Applied publication worksheet defaults to `tab` Excel export.
- Added public assertions for `EconometricResults.to_excel()` and
  `EconometricResults.to_word()`, which delegate to `regtable`.
- Styled empty Excel body rows so empty tables still carry the same typography
  and bottom rule as non-empty tables.

Tests added:

- Word helper coverage now checks margins and document styles.
- Public API tests now check DOCX margins/styles and XLSX freeze panes,
  hidden gridlines, print-title rows, and fit-to-page settings through
  `paper_tables`, `collect`, `regtable`, result-protocol exports, and `tab`.
- Single-model `EconometricResults.to_excel()` / `.to_word()` coverage now
  checks that delegated `regtable` output carries the same workbook and
  document defaults.

## Verification Log

Completed so far:

```bash
.venv/bin/python -m py_compile \
  src/statspai/output/_aer_style.py \
  src/statspai/output/_excel_style.py \
  src/statspai/output/sumstats.py \
  src/statspai/output/mean_comparison.py \
  src/statspai/output/paper_tables.py \
  src/statspai/output/collection.py \
  src/statspai/output/regression_table.py

.venv/bin/python -m pytest \
  tests/test_aer_style.py \
  tests/test_aer_word_style.py \
  tests/test_excel_style_helpers.py \
  tests/test_paper_tables_export.py \
  tests/test_collection.py \
  tests/test_econometric_results_export.py \
  tests/test_multi_se.py::test_multi_se_appears_in_excel \
  tests/test_journal_presets.py \
  -q
# 110 passed

.venv/bin/python -m pytest \
  tests/test_sumstats.py \
  tests/test_export.py \
  tests/test_modelsummary.py \
  tests/test_paper_tables.py \
  tests/test_regtable_round2_extensions.py \
  tests/test_regtable_publication_extensions.py \
  tests/test_output_and_survey_helpers.py \
  tests/test_export_surface_contract.py \
  -q
# 173 passed

.venv/bin/python -m pytest \
  tests/test_collection.py \
  tests/test_paper_tables_export.py \
  tests/test_aer_style.py \
  tests/test_aer_word_style.py \
  tests/test_excel_style_helpers.py \
  tests/test_multi_se.py::test_multi_se_appears_in_excel \
  tests/test_regtable_publication_extensions.py \
  -q
# 88 passed

.venv/bin/python -m pytest \
  tests/test_aer_style.py \
  tests/test_aer_word_style.py \
  tests/test_excel_style_helpers.py \
  tests/test_paper_tables_export.py \
  tests/test_collection.py \
  tests/test_econometric_results_export.py \
  tests/test_multi_se.py::test_multi_se_appears_in_excel \
  tests/test_journal_presets.py \
  tests/test_sumstats.py \
  tests/test_export.py \
  tests/test_modelsummary.py \
  tests/test_paper_tables.py \
  tests/test_regtable_round2_extensions.py \
  tests/test_regtable_publication_extensions.py \
  tests/test_output_and_survey_helpers.py \
  tests/test_export_surface_contract.py \
  -q
# 285 passed, 39 warnings (expected deprecation/sample-size warnings)

.venv/bin/python -m pytest tests/test_excel_style_helpers.py -q
# 3 passed

.venv/bin/python -m pytest tests/test_econometric_results_export.py -q
# 29 passed

.venv/bin/python -m pytest \
  tests/test_aer_style.py \
  tests/test_excel_style_helpers.py \
  --no-cov -q
# 26 passed

.venv/bin/python -m pytest \
  tests/test_paper_tables_export.py \
  tests/test_collection.py \
  tests/test_regtable_publication_extensions.py \
  tests/test_aer_word_style.py \
  tests/test_postestimation.py \
  tests/test_sumstats.py \
  tests/test_export.py \
  tests/test_multi_se.py::test_multi_se_appears_in_excel \
  --no-cov -q
# 113 passed, 12 warnings (expected deprecation/sample-size warnings)

.venv/bin/python -m py_compile \
  src/statspai/output/_aer_style.py \
  src/statspai/output/_excel_style.py \
  src/statspai/output/sumstats.py \
  src/statspai/output/mean_comparison.py \
  src/statspai/output/paper_tables.py \
  src/statspai/output/collection.py \
  src/statspai/output/regression_table.py \
  src/statspai/output/tab.py
# passed

.venv/bin/python -m pytest \
  tests/test_aer_style.py \
  tests/test_aer_word_style.py \
  tests/test_excel_style_helpers.py \
  tests/test_paper_tables_export.py \
  tests/test_collection.py \
  tests/test_econometric_results_export.py \
  tests/test_multi_se.py::test_multi_se_appears_in_excel \
  tests/test_journal_presets.py \
  tests/test_sumstats.py \
  tests/test_export.py \
  tests/test_modelsummary.py \
  tests/test_paper_tables.py \
  tests/test_regtable_round2_extensions.py \
  tests/test_regtable_publication_extensions.py \
  tests/test_postestimation.py \
  tests/test_output_and_survey_helpers.py \
  tests/test_export_surface_contract.py \
  --no-cov -q
# 305 passed, 39 warnings (expected deprecation/sample-size warnings)

git diff --check
# passed

git status --short --branch --untracked-files=all
# root changes limited to statspai.output, focused output tests, and this plan

git -C Paper-JSS status --short --branch --untracked-files=all
# clean: ## main...origin/main

git -C CausalAgentBench status --short --branch --untracked-files=all
# clean: ## main...origin/main
```

Excluded paths confirmed untouched:

- `Paper-JSS/`
- `CausalAgentBench/`
- `paper.md`
- `paper.bib`
- `docs/joss_*`
