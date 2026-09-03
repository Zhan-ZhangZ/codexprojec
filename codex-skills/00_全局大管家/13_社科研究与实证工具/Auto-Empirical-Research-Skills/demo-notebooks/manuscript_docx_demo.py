#!/usr/bin/env python3
"""Data → full-text Word manuscript: the last hop of the pipeline, demonstrated.

What this shows
---------------
The other demos in this folder run an analysis and stop at exhibits. Look at what
they leave behind:

    _statspai_pipeline_outputs_5.2/replication/paper.docx
        → 5 tables, 0 figures, headings only

That file is a *table bundle*, not a manuscript. It is what "export the paper to
Word" produced before there was a step that assembled one. This script runs that
missing step against the very same committed exhibits, and produces:

    _manuscript_docx_demo/09_submission/main.docx
        → body prose + the real Table 2 + a real figure + reference list, one file

It uses no synthetic data: the table, the figure and the numbers quoted in the
prose all come from `_statspai_pipeline_outputs_5.2/`, which is committed output
from the LaLonde NSW demo pipeline.

Why the prose quotes numbers at all
-----------------------------------
Because that is the part that can silently go wrong. The manuscript asserts
`1548.244` and `614`; `check_manuscript_numbers.py` re-derives every number in the
finished `.docx` and refuses any that does not trace back to an analysis artifact
at the precision it is printed. Running the gates here is the point of the demo,
not a formality.

Usage:
    python3 demo-notebooks/manuscript_docx_demo.py
    python3 demo-notebooks/manuscript_docx_demo.py --keep   # leave the workspace

Requires the `skills/69-Paper-WorkFlow/` submodule (`git submodule update --init`).
`pandoc` is optional — without it the assembler uses its stdlib builtin writer.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PW = ROOT / "skills" / "69-Paper-WorkFlow"
SRC = Path(__file__).resolve().parent / "_statspai_pipeline_outputs_5.2"
OUT = Path(__file__).resolve().parent / "_manuscript_docx_demo"

TABLE = SRC / "tables" / "table2_main.tex"
FIGURE = SRC / "figures" / "fig3_coefplot.png"

# Every number below appears in table2_main.tex; nothing here is invented, which
# is exactly what the numeric gate is about to verify.
MANUSCRIPT = """# Effect of NSW Job Training on 1978 Earnings

## 1. Introduction

This note replicates the LaLonde NSW training evaluation to demonstrate the
manuscript-assembly stage of the Paper-WorkFlow pipeline. The substantive question
is whether participation in the National Supported Work demonstration raised
earnings in 1978, and how sensitive the answer is to the control set.

## 2. Results

Column (1) of Table 2 regresses 1978 earnings on the training indicator with no
controls and recovers a negative point estimate, which is the well-known
consequence of comparing the treated sample to an observational comparison group
that differs sharply in pre-treatment characteristics. Adding the full control set
in column (2) reverses the sign: training is associated with 1548.244 dollars of
additional 1978 earnings, significant at the 5 percent level. The estimation
sample contains 614 observations throughout, so the movement between columns is
driven entirely by the conditioning set rather than by a change in sample.

{{ include: table2_main }}

The instrumental-variables specification in column (3) is reported for
completeness rather than as a preferred estimate: its first-stage F statistic of
14.21 sits close to conventional weak-instrument thresholds and the Hansen J
p-value of 0.029 rejects the overidentifying restrictions, so the column is not
evidence for a causal claim and is not read as one here.

![Figure 1. Coefficient estimates across specifications](fig3_coefplot.png)

Figure 1 plots the treatment coefficient across specifications and makes the
sensitivity visible directly: the estimate is not stable enough across control
sets for this design to support an unqualified causal reading, which is the honest
conclusion the exhibits actually license.

## 3. Conclusion

The exercise reproduces the standard LaLonde teaching result and, more to the
point here, produces a single Word file that contains the prose, the table, the
figure and the reference list together, with every printed number traceable to a
committed analysis artifact.
"""

BIB = """@article{lalonde1986,
  author = {LaLonde, Robert J.},
  title = {Evaluating the Econometric Evaluations of Training Programs with Experimental Data},
  journal = {American Economic Review},
  year = {1986},
  volume = {76},
  pages = {604--620},
}

@article{dehejia1999,
  author = {Dehejia, Rajeev H. and Wahba, Sadek},
  title = {Causal Effects in Nonexperimental Studies},
  journal = {Journal of the American Statistical Association},
  year = {1999},
  volume = {94},
  pages = {1053--1062},
}
"""


def booktabs(tex: str) -> str:
    """Rewrite `\\hline` rules as booktabs rules in this demo's *copy* of the table.

    The committed exhibit under `_statspai_pipeline_outputs_5.2/` was written by
    StatsPAI's `.to_latex()`, which emits `\\hline\\hline` / `\\hline`. That is a
    pre-existing property of that output, not something this demo introduces, and
    the file itself is left untouched — but `check_table_style.py` checks the
    paired `.tex` as well as the `.docx`, because a booktabs-free `.tex` silently
    reintroduces the grid at compile time. Normalising the copy is what a real
    Stage 9 run would do before shipping.
    """
    head, sep, tail = tex.partition(r"\hline\hline")
    if not sep:
        return tex
    body, sep2, rest = tail.rpartition(r"\hline\hline")
    if not sep2:
        return tex
    body = body.replace(r"\hline", r"\midrule")
    return head + "\\toprule" + body + "\\bottomrule" + rest


def fail(message: str) -> "int":
    print(f"FAIL: {message}", file=sys.stderr)
    return 1


def build_workspace() -> Path:
    if OUT.exists():
        shutil.rmtree(OUT)
    for rel in ("00_meta", "03_analysis/results", "04_results", "05_draft", "09_submission"):
        (OUT / rel).mkdir(parents=True)

    (OUT / "05_draft" / "main.md").write_text(MANUSCRIPT, encoding="utf-8")
    (OUT / "05_draft" / "ref.bib").write_text(BIB, encoding="utf-8")
    (OUT / "04_results" / "table2_main.tex").write_text(
        booktabs(TABLE.read_text(encoding="utf-8")), encoding="utf-8")
    shutil.copy(FIGURE, OUT / "04_results" / "fig3_coefplot.png")

    # The analysis artifact the prose is checked against.
    (OUT / "03_analysis" / "results" / "main_results.json").write_text(json.dumps({
        "ols_no_controls": {"coef": -635.026, "se": 676.748, "n": 614},
        "ols_full_controls": {"coef": 1548.244, "se": 740.576, "n": 614, "r2": 0.148},
        "iv_2sls": {"coef": -5955.471, "se": 4072.115, "n": 614,
                    "first_stage_F": 14.21, "hansen_j_p": 0.029},
    }, indent=2), encoding="utf-8")

    (OUT / "00_meta" / "workflow_state.json").write_text(json.dumps({
        "schema_version": 14,
        "manuscript": {
            "format": "markdown",
            "body_file": "05_draft/main.md",
            "deliverable": "docx",
            "deliverable_docx": "09_submission/main.docx",
            "docx_status": "pending",
            "converter": "",
            "reference_docx": "",
            "csl": "",
            "exhibits_embedded": 0,
            "figures_embedded": 0,
            "unresolved_markers": [],
            "last_assembly": "",
        },
        "table_style": {"format": "three-line", "typography_preset": "en-journal"},
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    return OUT


def run_step(title: str, argv: list[str]) -> bool:
    print(f"\n$ {' '.join(Path(a).name if a.endswith('.py') else a for a in argv[1:])}")
    proc = subprocess.run(argv, capture_output=True, text=True)
    print(proc.stdout.strip() or proc.stderr.strip())
    ok = proc.returncode == 0
    print(f"  → {title}: {'PASS' if ok else 'FAIL'}")
    return ok


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--keep", action="store_true",
                        help="keep the generated workspace (default: it is kept anyway)")
    parser.parse_args(argv)

    if not (PW / "scripts" / "assemble_manuscript_docx.py").exists():
        return fail("skills/69-Paper-WorkFlow/ is not checked out — run "
                    "`git submodule update --init skills/69-Paper-WorkFlow`")
    for src in (TABLE, FIGURE):
        if not src.exists():
            return fail(f"missing committed demo exhibit: {src.relative_to(ROOT)}")

    ws = build_workspace()
    print(f"workspace: {ws.relative_to(ROOT)}")
    print("  note: the committed table2_main.tex uses \\hline (StatsPAI to_latex output);")
    print("        this demo booktabs-normalises its own copy, leaving the original untouched.")

    ok = run_step(
        "assemble the full-text .docx",
        [sys.executable, str(PW / "scripts" / "assemble_manuscript_docx.py"), str(ws)])
    ok &= run_step(
        "deliverable contract (tables/figures/prose/unresolved)",
        [sys.executable, str(PW / "scripts" / "check_deliverable_contract.py"), str(ws), "--strict"])
    ok &= run_step(
        "three-line table export",
        [sys.executable, str(PW / "scripts" / "check_table_style.py"), str(ws)])
    ok &= run_step(
        "every printed number traces to analysis output",
        [sys.executable, str(PW / "scripts" / "check_manuscript_numbers.py"), str(ws)])

    docx = ws / "09_submission" / "main.docx"
    print("\n" + "=" * 64)
    if ok and docx.is_file():
        sys.path.insert(0, str(PW / "scripts"))
        from assemble_manuscript_docx import count_docx_exhibits  # noqa: PLC0415

        tables, figures = count_docx_exhibits(docx)
        print(f"  {docx.relative_to(ROOT)}")
        print(f"  {docx.stat().st_size:,} bytes · {tables} table(s) · {figures} figure(s) · prose + references")
        print("\n  Compare with the analysis-only export this repo already shipped:")
        print("  _statspai_pipeline_outputs_5.2/replication/paper.docx → 5 tables, 0 figures, no prose")
        print("=" * 64)
        return 0
    print("  demo did NOT produce a passing deliverable")
    print("=" * 64)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
