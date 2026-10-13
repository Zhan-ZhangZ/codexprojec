// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

namespace OfficeCli.Core;

/// <summary>
/// Excel's <c>sep=&lt;char&gt;</c> first line: a declaration of the field
/// separator, not data. Excel writes it on some CSV exports and consumes it on
/// open — verified against desktop Excel, where the same three-column file
/// opens as three columns WITH the line and as one column without it, and the
/// line itself never appears in a cell.
///
/// Reading it matters even when the caller already knows the separator: left in
/// place it becomes a junk first row that pushes every real row down one, so
/// <c>--header</c> freezes and auto-filters the junk instead of the header.
/// </summary>
internal static class CsvSepDeclaration
{
    /// <summary>
    /// Split a leading <c>sep=X</c> line off the content. Returns false (and
    /// leaves <paramref name="remainder"/> as the original content) when the
    /// first line is anything else — including <c>sep=</c> with no character or
    /// with more than one, which Excel does not treat as a declaration either.
    /// </summary>
    public static bool TryRead(string content, out char separator, out string remainder)
    {
        separator = '\0';
        remainder = content;
        if (string.IsNullOrEmpty(content)) return false;

        int start = content[0] == '﻿' ? 1 : 0;
        int end = content.IndexOf('\n', start);
        // A declaration with no row after it is still a declaration, but there
        // is nothing to import — leave that to the caller.
        var line = end < 0 ? content[start..] : content[start..end];
        if (line.EndsWith('\r')) line = line[..^1];

        if (line.Length != 5) return false;
        if (!line.StartsWith("sep=", StringComparison.OrdinalIgnoreCase)) return false;

        separator = line[4];
        remainder = end < 0 ? "" : content[(end + 1)..];
        return true;
    }
}
