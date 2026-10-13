// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using System.Globalization;
using System.Text.RegularExpressions;

namespace OfficeCli.Core;

/// <summary>
/// One definition of "this text is a number", shared by every place that
/// coerces a string into a double: cell-value ingestion, formula evaluation,
/// pivot aggregation and selector comparison.
///
/// .NET's <c>AllowThousands</c> does not check group SIZE, so
/// <c>double.TryParse("1,5", NumberStyles.Any, …)</c> succeeds with 15 and
/// "2,75" with 275 — a silent 10x/100x error on the normal decimal spelling of
/// de-DE, ru-RU and most of Europe. Real Excel disagrees: given the TEXT "1,5",
/// <c>=A1*2</c> returns #VALUE!, while "1,234" (a well-formed thousands group)
/// returns 2468. Verified against desktop Excel, and this class implements that
/// same line.
///
/// The point is that the answer cannot be guessed from the text: "1,5" is 1.5 to
/// a German user and 15 to nobody. Refusing it keeps the original digits intact
/// and visible instead of inventing a magnitude.
/// </summary>
internal static class NumericText
{
    /// <summary>
    /// True when the text carries no comma, or only well-formed thousands
    /// separators: exactly three digits after each comma, a digit before it, and
    /// none of them past the decimal point. So "1,234", "1,234,567" and
    /// "1,234.5" pass; "1,5", "1,23", "1,2345" and the full de-DE "1.234,5" do
    /// not.
    /// </summary>
    public static bool HasValidThousandsGrouping(string text)
    {
        int dot = text.IndexOf('.');
        for (int i = text.IndexOf(','); i >= 0; i = text.IndexOf(',', i + 1))
        {
            if (dot >= 0 && i > dot) return false;                       // 1.234,5
            if (i == 0 || !char.IsAsciiDigit(text[i - 1])) return false; // ",5" / "-,5"
            if (i + 3 >= text.Length) return false;                      // fewer than 3 after
            for (int k = 1; k <= 3; k++)
                if (!char.IsAsciiDigit(text[i + k])) return false;
            if (i + 4 < text.Length && char.IsAsciiDigit(text[i + 4])) return false; // 4+
        }
        return true;
    }

    /// <summary>
    /// A bare digits-comma-digits spelling ("1,5", "2,75") — a decimal comma to
    /// most of Europe, and never a date. The arithmetic coercions fall back to
    /// DateTime.TryParse when text is not numeric, and that reads "1,5" as
    /// January 5 and returns its serial, so the shape has to be excluded there
    /// explicitly. Real Excel answers #VALUE! for it.
    /// </summary>
    public static bool IsDecimalCommaSpelling(string? text)
        => text != null && DecimalComma.IsMatch(text);

    private static readonly Regex DecimalComma =
        new(@"^\s*[+-]?\d+,\d+\s*$", RegexOptions.Compiled);

    /// <summary>
    /// Rewrite a number written with a decimal COMMA into the invariant form, or
    /// fail. Only used when the caller has explicitly declared that convention
    /// (<c>import --decimal ','</c>) — the default never guesses, because "1,234"
    /// is 1234 under one convention and 1.234 under the other and the text alone
    /// cannot say which.
    ///
    /// Declaring a decimal comma also settles the group separator: it becomes
    /// '.', and the same three-digit rule applies to it. So "1.234,5" is
    /// 1234.5 and "1,5" is 1.5, while "1.5" is NOT a number under this
    /// convention (a one-digit group) and stays text.
    /// </summary>
    public static bool TryRewriteCommaDecimal(string text, out string invariant)
    {
        invariant = text;
        var t = text.Trim();
        if (t.Length == 0) return false;
        if (t.Count(c => c == ',') > 1) return false;

        int comma = t.IndexOf(',');
        // Every '.' must be a well-formed thousands group, and none may follow
        // the decimal comma.
        for (int i = t.IndexOf('.'); i >= 0; i = t.IndexOf('.', i + 1))
        {
            if (comma >= 0 && i > comma) return false;
            if (i == 0 || !char.IsAsciiDigit(t[i - 1])) return false;
            if (i + 3 >= t.Length) return false;
            for (int k = 1; k <= 3; k++)
                if (!char.IsAsciiDigit(t[i + k])) return false;
            if (i + 4 < t.Length && char.IsAsciiDigit(t[i + 4])) return false;
        }
        if (comma == 0 || (comma > 0 && !char.IsAsciiDigit(t[comma - 1]))) return false;
        if (comma >= 0 && (comma + 1 >= t.Length || !char.IsAsciiDigit(t[comma + 1]))) return false;

        invariant = t.Replace(".", "").Replace(',', '.');
        return true;
    }

    /// <summary>
    /// <c>double.TryParse</c> with <see cref="NumberStyles.Any"/> and the
    /// invariant culture, minus the malformed-grouping spellings .NET would
    /// otherwise accept. Drop-in replacement for that call at every site that
    /// turns document text into a number.
    /// </summary>
    public static bool TryParse(string? text, out double value)
    {
        value = 0;
        return text != null
            && HasValidThousandsGrouping(text)
            && double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value);
    }
}
