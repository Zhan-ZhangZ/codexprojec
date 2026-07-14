"""Smoke tests for shared Excel table styling helpers."""

from __future__ import annotations

import pandas as pd
import pytest

from statspai.output._excel_style import (
    TIMES,
    render_dataframe_to_sheet,
    render_dataframe_to_xlsx,
    safe_sheet_name,
)


def test_render_dataframe_to_xlsx_applies_shared_booktab_style(tmp_path):
    openpyxl = pytest.importorskip("openpyxl")
    df = pd.DataFrame(
        {"Mean": ["1.23"], "SD": ["0.45"]},
        index=["x"],
    )
    path = tmp_path / "table.xlsx"

    render_dataframe_to_xlsx(
        df,
        str(path),
        title="Table A",
        notes=["Note text."],
        index_label="Variable",
    )

    wb = openpyxl.load_workbook(path)
    ws = wb["Table"]

    assert ws["A1"].value == "Table A"
    assert ws["A1"].font.name == TIMES
    assert ws["A2"].value == "Variable"
    assert ws["A3"].value == "x"
    assert ws["A4"].value == "Note text."
    assert ws["A2"].border.top.style == "medium"
    assert ws["A2"].border.bottom.style == "thin"
    assert ws["A3"].border.bottom.style == "medium"
    assert ws.sheet_view.showGridLines is False
    assert ws.freeze_panes == "B3"
    assert ws.print_title_rows == "$2:$2"
    assert "$A$1:$C$4" in str(ws.print_area)
    assert ws.sheet_properties.pageSetUpPr.fitToPage
    assert ws.page_setup.fitToWidth == 1
    assert ws.page_setup.orientation == "portrait"
    assert ws.page_margins.left == 0.5


def test_render_dataframe_to_sheet_reuses_shared_style(tmp_path):
    openpyxl = pytest.importorskip("openpyxl")
    df = pd.DataFrame({"Mean": ["1.23"]}, index=["x"])
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Panel"

    next_row = render_dataframe_to_sheet(
        ws,
        df,
        title="Panel A",
        notes="Panel note.",
        index_label="Variable",
    )

    assert next_row == 5
    assert ws["A1"].value == "Panel A"
    assert ws["A2"].value == "Variable"
    assert ws["A3"].value == "x"
    assert ws["A4"].value == "Panel note."
    assert ws["A2"].font.name == TIMES
    assert ws["A2"].border.top.style == "medium"
    assert ws["A2"].border.bottom.style == "thin"
    assert ws["A3"].border.bottom.style == "medium"
    assert ws.sheet_view.showGridLines is False
    assert ws.freeze_panes == "B3"
    assert ws.print_title_rows == "$2:$2"
    assert ws.sheet_properties.pageSetUpPr.fitToPage
    assert ws.page_setup.fitToWidth == 1
    assert ws.page_margins.left == 0.5


def test_render_dataframe_to_sheet_styles_empty_body_row():
    openpyxl = pytest.importorskip("openpyxl")
    df = pd.DataFrame(columns=["Mean", "SD"])
    wb = openpyxl.Workbook()
    ws = wb.active

    next_row = render_dataframe_to_sheet(
        ws,
        df,
        notes=["No observations."],
        index_label="Variable",
    )

    assert next_row == 4
    assert ws["A2"].value == ""
    assert ws["A2"].font.name == TIMES
    assert ws["A2"].border.bottom.style == "medium"
    assert ws["A3"].value == "No observations."
    assert ws.freeze_panes == "B2"


def test_safe_sheet_name_replaces_invalid_chars_and_collisions():
    assert safe_sheet_name("main/table*1") == "main_table_1"
    assert safe_sheet_name("", existing=()) == "Table"
    assert safe_sheet_name("main/table", existing=["main_table"]) == "main_table_2"
    assert len(safe_sheet_name("x" * 80)) == 31
    assert safe_sheet_name("x" * 31, existing=["x" * 31]).endswith("_2")
