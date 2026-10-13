// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

namespace OfficeCli.Core;

/// <summary>
/// NEWLINE-SEMANTICS-V2 dump versioning. A v2 dump starts with
/// {"command":"meta","dumpVersion":2} and encodes docx soft line breaks as
/// '\v' in text props, with '\n' reserved for paragraph boundaries (unified
/// with pptx and the Google Docs API convention). A pre-v2 dump encoded a
/// docx soft break as '\n', so replaying one under v2 semantics would explode
/// every soft break into a paragraph split; such a dump opts back into the old
/// reading by declaring {"command":"meta","dumpVersion":1}, which makes
/// <see cref="PrepareForReplay"/> rewrite '\n' → '\v' in text props.
///
/// A batch that declares no version is read with CURRENT semantics. It used to
/// be read as legacy, on the theory that only dumps are ever replayed — but a
/// hand-written or generated batch carries no meta item either, so the shim
/// fired on ordinary input and one batch item behaved differently from the
/// identical single command: `text=A\nB` split into two paragraphs from the
/// CLI and produced one paragraph with a soft break through batch. Versioning
/// is opt-in for the file format that has a version; everything else follows
/// the documented rule that '\n' is a paragraph and '\v' is a line break.
/// </summary>
public static class BatchCompat
{
    public const int CurrentDumpVersion = 2;

    public static BatchItem MetaItem() => new()
    {
        Command = "meta",
        DumpVersion = CurrentDumpVersion,
    };

    /// <summary>
    /// Strip meta items and apply the legacy-newline shim when the batch
    /// targets a .docx and explicitly declares a dumpVersion below 2.
    /// A batch with no meta item is left alone. Call before executing any
    /// items. Idempotent.
    /// </summary>
    public static void PrepareForReplay(List<BatchItem> items, string targetFilePath)
    {
        int? declared = null;
        for (int i = items.Count - 1; i >= 0; i--)
        {
            if (string.Equals(items[i].Command, "meta", StringComparison.OrdinalIgnoreCase))
            {
                if (items[i].DumpVersion is { } v && v > (declared ?? 0)) declared = v;
                items.RemoveAt(i);
            }
        }
        if ((declared ?? CurrentDumpVersion) >= 2) return;
        if (!targetFilePath.EndsWith(".docx", StringComparison.OrdinalIgnoreCase)) return;

        foreach (var item in items)
        {
            // Legacy docx dumps carry soft breaks as '\n' inside text-bearing
            // fields. Rewrite to '\v' so v2 handlers rebuild <w:br/> instead
            // of splitting paragraphs. Scope: the "text" prop plus the
            // item-level Text field — the only carriers the v1 emitters used.
            if (item.Props != null && item.Props.TryGetValue("text", out var t)
                && t != null && t.IndexOf('\n') >= 0)
                item.Props["text"] = t.Replace("\n", "\v");
            if (item.Text != null && item.Text.IndexOf('\n') >= 0)
                item.Text = item.Text.Replace("\n", "\v");
        }
    }

    /// <summary>
    /// Cross-document numbering replay (issue #404). A `dump /numbering`
    /// rebuilds the source's list definitions as typed adds that carry the
    /// SOURCE ids (`add w:abstractNum {w:abstractNumId}`, `add w:num {w:numId}`,
    /// `add w:abstractNumId {w:val}` under the num) and the dumped paragraphs
    /// reference them via `numId`. Replayed into a target that already has
    /// numbering, those ids collide: Word then sees duplicate definitions and
    /// the cloned paragraph silently joins the target's unrelated list.
    ///
    /// Walk the batch in order; every definition whose id is already taken
    /// (by the target or by an earlier item of this batch) gets the next free
    /// id, and every later reference in the SAME batch is rewritten: the
    /// num→abstractNum link and each add/set `numId` prop. References to ids
    /// this batch did not define are left alone — they name the target's own
    /// lists on purpose. Blank targets and self round-trips see no change.
    /// Returns the number of rewritten values.
    /// </summary>
    public static int RemapNumberingIds(List<BatchItem> items,
        IEnumerable<int> existingAbstractNumIds, IEnumerable<int> existingNumIds)
    {
        var takenAbs = new HashSet<int>(existingAbstractNumIds);
        var takenNum = new HashSet<int>(existingNumIds);
        var absMap = new Dictionary<int, int>();
        var numMap = new Dictionary<int, int>();
        int changes = 0;

        static bool TryGetInt(Dictionary<string, string> props, string key, out string actualKey, out int value)
        {
            foreach (var kv in props)
            {
                if (string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase)
                    && int.TryParse(kv.Value, out value))
                {
                    actualKey = kv.Key;
                    return true;
                }
            }
            actualKey = key; value = 0;
            return false;
        }
        static int NextFree(HashSet<int> taken)
        {
            var n = taken.Count == 0 ? 1 : taken.Max() + 1;
            if (n < 1) n = 1;
            return n;
        }
        static bool IsNumberingRoot(string? parent) =>
            string.Equals((parent ?? "").TrimEnd('/'), "/numbering", StringComparison.OrdinalIgnoreCase);

        foreach (var item in items)
        {
            if (item.Props == null) continue;
            bool isAdd = string.Equals(item.Command, "add", StringComparison.OrdinalIgnoreCase);
            bool isSet = string.Equals(item.Command, "set", StringComparison.OrdinalIgnoreCase);
            var type = item.Type ?? "";

            if (isAdd && IsNumberingRoot(item.Parent)
                && string.Equals(type, "w:abstractNum", StringComparison.OrdinalIgnoreCase)
                && TryGetInt(item.Props, "w:abstractNumId", out var absKey, out var absId))
            {
                if (takenAbs.Contains(absId))
                {
                    var fresh = NextFree(takenAbs);
                    absMap[absId] = fresh;
                    item.Props[absKey] = fresh.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    absId = fresh;
                    changes++;
                }
                takenAbs.Add(absId);
            }
            else if (isAdd && IsNumberingRoot(item.Parent)
                && string.Equals(type, "w:num", StringComparison.OrdinalIgnoreCase)
                && TryGetInt(item.Props, "w:numId", out var numKey, out var numId))
            {
                if (takenNum.Contains(numId))
                {
                    var fresh = NextFree(takenNum);
                    numMap[numId] = fresh;
                    item.Props[numKey] = fresh.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    numId = fresh;
                    changes++;
                }
                takenNum.Add(numId);
            }
            else if (isAdd && absMap.Count > 0
                && string.Equals(type, "w:abstractNumId", StringComparison.OrdinalIgnoreCase)
                && (item.Parent ?? "").StartsWith("/numbering/num", StringComparison.OrdinalIgnoreCase)
                && TryGetInt(item.Props, "w:val", out var valKey, out var refId)
                && absMap.TryGetValue(refId, out var mappedAbs))
            {
                item.Props[valKey] = mappedAbs.ToString(System.Globalization.CultureInfo.InvariantCulture);
                changes++;
            }
            else if ((isAdd || isSet) && numMap.Count > 0
                && TryGetInt(item.Props, "numId", out var pKey, out var pNumId)
                && numMap.TryGetValue(pNumId, out var mappedNum))
            {
                item.Props[pKey] = mappedNum.ToString(System.Globalization.CultureInfo.InvariantCulture);
                changes++;
            }
        }
        return changes;
    }
}
