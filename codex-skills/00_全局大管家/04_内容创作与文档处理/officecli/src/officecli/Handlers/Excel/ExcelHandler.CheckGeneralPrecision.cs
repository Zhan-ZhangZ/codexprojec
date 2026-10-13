// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using System.Globalization;
using DocumentFormat.OpenXml.Spreadsheet;

namespace OfficeCli.Handlers;

public partial class ExcelHandler
{
    // Excel's General format caps the display at 11 significant digits and
    // switches to scientific notation past that — regardless of column width.
    // Verified against desktop Excel with a General column at width 20:
    //
    //   1234567890      (10 digits) -> 1234567890
    //   12345678901     (11 digits) -> 12345678901
    //   123456789012    (12 digits) -> 1.23457E+11
    //   1234567890123   (13 digits) -> 1.23457E+12
    //
    // Widening does not help: the 13-digit value still rendered as
    // 1.23457E+12 at widths 14/16/18/20/24. Applying an explicit numeric
    // format at the same width restored the full 1234567890123.
    //
    // This is the sibling of the numeric-fit scan in
    // ExcelHandler.CheckNumericOverflow.cs, and deliberately disjoint from it:
    // that one reports values whose EXPLICIT format cannot fit the column and
    // suggests a width; this one reports values whose displayed precision is
    // lost to General no matter the width, and suggests a number format. A
    // cell is never reported by both — one requires an explicit format, the
    // other requires General.

    private const int GeneralSignificantDigitCap = 11;

    // Excel itself keeps only 15 significant digits of a stored number, so an
    // explicit format cannot recover more than that either.
    private const int ExcelStoredSignificantDigits = 15;

    private sealed record GeneralPrecisionFinding(
        string Path,
        string Message,
        string Context,
        string Suggestion);

    private List<GeneralPrecisionFinding> CheckAllGeneralPrecisionLoss(int? limit = null)
    {
        var findings = new List<GeneralPrecisionFinding>();
        if (limit is <= 0) return findings;
        // A workbook with no stylesheet (or an empty cellXfs) has no way to
        // carry a number format, so EVERY numeric cell in it is General —
        // exactly the case this scan exists for. Bailing out here, the way the
        // width-based sibling must, would blind the check to the most
        // General-heavy workbooks there are.
        var stylesheet = _doc.WorkbookPart?.WorkbookStylesPart?.Stylesheet;
        var renderStyles = stylesheet == null ? null : new RenderStyleArrays(stylesheet);
        bool everythingIsGeneral = stylesheet == null
            || renderStyles!.CellFormats.Length == 0;

        foreach (var (sheetName, part) in GetWorksheets(_doc))
        {
            // A hidden sheet has no delivered visual surface.
            if (IsSheetHidden(sheetName)) continue;
            var ws = part.Worksheet;
            if (ws == null) continue;
            var sheetData = ws.GetFirstChild<SheetData>();
            if (sheetData == null) continue;

            bool showFormulas = SheetShowsFormulas(ws);
            var evaluator = new Core.FormulaEvaluator(sheetData, _doc.WorkbookPart);
            var hiddenCols = GetHiddenColumns(ws);
            var columnStyles = GetColumnStyleIndexes(ws);

            foreach (var row in sheetData.Elements<Row>()
                         .OrderBy(row => row.RowIndex?.Value ?? uint.MaxValue))
            {
                int rowIndex = (int)(row.RowIndex?.Value ?? 0);
                if (rowIndex <= 0) continue;
                if (row.Hidden?.Value == true || row.Height?.Value == 0) continue;

                foreach (var cell in row.Elements<Cell>())
                {
                    // Show Formulas replaces a formula cell's display with its
                    // source text, so General never renders its value there.
                    if (showFormulas && cell.CellFormula != null) continue;
                    var cellRef = cell.CellReference?.Value;
                    if (string.IsNullOrEmpty(cellRef)) continue;

                    var (startCol, _) = ParseCellReference(cellRef);
                    int startColIdx = ColumnNameToIndex(startCol);
                    if (hiddenCols.Contains(startColIdx)) continue;

                    // Only General loses precision this way; every explicit
                    // format renders what it declares and is the other scan's
                    // territory.
                    if (!everythingIsGeneral)
                    {
                        uint styleIndex = ResolveNumericFitStyleIndex(
                            cell, row, startColIdx, columnStyles);
                        var resolvedFormat = ResolveNumericFitFormatCode(
                            styleIndex, stylesheet!, renderStyles!);
                        if (!string.IsNullOrWhiteSpace(resolvedFormat)
                            && !IsGeneralFormatSection(resolvedFormat))
                            continue;
                    }

                    if (!TryGetNumericValue(cell, evaluator, out var value)) continue;
                    if (!double.IsFinite(value) || value == 0) continue;

                    if (!TryGetLostPrecision(value, out var exact, out var sigDigits))
                        continue;

                    var shown = FormatAsGeneral(value);
                    findings.Add(new GeneralPrecisionFinding(
                        $"/{sheetName}/{cellRef}",
                        $"General precision loss: {sigDigits} significant digits stored, "
                            + $"Excel displays '{shown}' (General caps at {GeneralSignificantDigitCap})",
                        $"stored={exact} displayed={shown}; widening the column does not change this",
                        SuggestFormat(value, sigDigits)));
                    if (limit.HasValue && findings.Count >= limit.Value) return findings;
                }
            }
        }

        return findings;
    }

    /// <summary>True when General cannot render the value positionally at any
    /// column width. <paramref name="exact"/> is the shortest round-trip form
    /// of the stored double.
    ///
    /// Two conditions must hold, and the second is what keeps this scan quiet:
    /// General first ROUNDS to 11 significant digits, so 46551.299999999996 —
    /// a binary-float artifact with 17 round-trip digits — displays as the
    /// perfectly ordinary 46551.3. Only when the INTEGER part alone needs 12+
    /// digits does the rounded value still not fit positionally, forcing
    /// scientific notation no matter how wide the column is. Flagging on
    /// significant digits alone produced 11,397 findings across the sample
    /// corpus, essentially all of them float noise on computed columns.</summary>
    private static bool TryGetLostPrecision(double value, out string exact, out int sigDigits)
    {
        exact = value.ToString("R", CultureInfo.InvariantCulture);
        sigDigits = CountSignificantDigits(exact);
        if (sigDigits <= GeneralSignificantDigitCap) return false;
        var magnitude = Math.Abs(value);
        // |value| >= 1e11 means 12+ integer digits.
        if (magnitude < 1e11) return false;
        // Only report what an explicit number format can actually fix. Excel
        // keeps 15 significant digits, so a value inside 1e15 with at most 15
        // of them renders in full under `0`. Past that — a pivot aggregate of
        // 5.556714093664954E+31, say — scientific notation is the only sane
        // display, no format helps, and a finding would be pure noise.
        return sigDigits <= ExcelStoredSignificantDigits && magnitude < 1e15;
    }

    /// <summary>Significant digits of a shortest-round-trip numeric string:
    /// mantissa digits with the sign, decimal point, exponent and leading
    /// zeros removed. Trailing zeros of an integer are significant here
    /// because Excel must render them positionally.</summary>
    private static int CountSignificantDigits(string roundTrip)
    {
        var mantissa = roundTrip;
        int e = mantissa.IndexOfAny(new[] { 'E', 'e' });
        if (e >= 0) mantissa = mantissa[..e];
        int count = 0;
        bool seenNonZero = false;
        foreach (var ch in mantissa)
        {
            if (!char.IsAsciiDigit(ch)) continue;   // sign, decimal point
            if (ch != '0') seenNonZero = true;
            else if (!seenNonZero) continue;        // leading zeros: 0.00123
            count++;
        }
        return count;
    }

    /// <summary>Excel's General rendering: at most 11 significant digits,
    /// scientific notation past that. Used for the reported display string.</summary>
    private static string FormatAsGeneral(double value)
    {
        var plain = value.ToString("R", CultureInfo.InvariantCulture);
        if (CountSignificantDigits(plain) <= GeneralSignificantDigitCap
            && !plain.Contains('E', StringComparison.OrdinalIgnoreCase))
            return plain;
        // Excel renders the scientific form with 5 decimals: 1.23457E+12.
        return value.ToString("0.#####E+00", CultureInfo.InvariantCulture);
    }

    private static string SuggestFormat(double value, int sigDigits)
    {
        var exact = value.ToString("R", CultureInfo.InvariantCulture);
        int dot = exact.IndexOf('.');
        if (dot < 0 || exact.Contains('E', StringComparison.OrdinalIgnoreCase))
            return "suggest.numberFormat=0; apply an explicit numeric format "
                + "(widening the column will not help)";

        int decimals = exact.Length - dot - 1;
        // Excel's number-format grammar allows at most 30 decimal places.
        if (decimals > 30)
            return "suggest.numberFormat=0.00000000000000; the value needs more decimal places "
                + "than Excel's 30-decimal format limit allows";
        return $"suggest.numberFormat=0.{new string('0', decimals)}; apply an explicit numeric "
            + "format (widening the column will not help)";
    }
}
