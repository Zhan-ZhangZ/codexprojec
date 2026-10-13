// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using System.Diagnostics;
using System.Text.Json;

namespace OfficeCli;

/// <summary>
/// The resident keeps edits in memory and flushes on idle/save/close — by
/// design. What was missing was the signal when that flush never happens: a
/// resident killed (SIGKILL, crash, power loss) inside the idle window took
/// its unflushed edits with it, and the next command answered "No pending
/// changes" as if nothing had been lost (issue #328).
///
/// This marker is that signal. It is written once when the resident's DOM
/// goes from clean to dirty, removed on every successful flush, and read by
/// the next process that opens the file cold: a marker whose owner process is
/// gone means the edits after <c>lastMutation</c> are gone too. It is
/// advisory only — it never blocks, never locks, and is consumed (deleted)
/// as soon as it has been reported once.
///
/// It lives in the user's state directory, keyed by the same path hash as
/// the resident's pipe, NOT next to the document: a sidecar beside the file
/// would be swept up by sync tools, refused on read-only shares, and seen by
/// users who never asked for it. Stale entries (owner dead, older than a
/// week) are swept whenever a resident starts, so the directory does not
/// accumulate.
/// </summary>
internal static class ResidentDirtyMarker
{
    public const string WarningCode = "resident_died_dirty";
    private static readonly TimeSpan StaleAfter = TimeSpan.FromDays(7);

    private sealed record Marker(string File, int Pid, DateTime Started, DateTime LastMutation);

    private static Marker? Read(string path)
    {
        using var doc = JsonDocument.Parse(File.ReadAllBytes(path));
        var r = doc.RootElement;
        return new Marker(
            r.GetProperty("file").GetString() ?? "",
            r.GetProperty("pid").GetInt32(),
            DateTime.Parse(r.GetProperty("started").GetString()!, null, System.Globalization.DateTimeStyles.RoundtripKind),
            DateTime.Parse(r.GetProperty("lastMutation").GetString()!, null, System.Globalization.DateTimeStyles.RoundtripKind));
    }

    internal static string Directory
    {
        get
        {
            var over = Environment.GetEnvironmentVariable("OFFICECLI_STATE_DIR");
            if (!string.IsNullOrEmpty(over)) return Path.Combine(over, "resident");
            if (OperatingSystem.IsWindows())
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OfficeCLI", "resident");
            var xdg = Environment.GetEnvironmentVariable("XDG_STATE_HOME");
            var root = !string.IsNullOrEmpty(xdg) ? Path.Combine(xdg, "officecli")
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".officecli");
            return Path.Combine(root, "resident");
        }
    }

    internal static string PathFor(string filePath)
        => Path.Combine(Directory, ResidentServer.GetPipeName(filePath) + ".dirty");

    /// <summary>Record that <paramref name="filePath"/> has unflushed edits in this process.</summary>
    public static void Write(string filePath, DateTime started)
    {
        try
        {
            System.IO.Directory.CreateDirectory(Directory);
            // Hand-written JSON: the binary ships trimmed with reflection-based
            // serialization disabled, so JsonSerializer would throw here.
            using var ms = new MemoryStream();
            using (var w = new Utf8JsonWriter(ms))
            {
                w.WriteStartObject();
                w.WriteString("file", Path.GetFullPath(filePath));
                w.WriteNumber("pid", Environment.ProcessId);
                w.WriteString("started", started.ToString("o"));
                w.WriteString("lastMutation", DateTime.UtcNow.ToString("o"));
                w.WriteEndObject();
            }
            File.WriteAllBytes(PathFor(filePath), ms.ToArray());
        }
        catch { /* best-effort: a marker that cannot be written must never fail a mutation */ }
    }

    /// <summary>Everything is on disk — nothing to warn about any more.</summary>
    public static void Clear(string filePath)
    {
        try { File.Delete(PathFor(filePath)); } catch { }
    }

    /// <summary>
    /// If a marker for <paramref name="filePath"/> exists and its owner process
    /// is gone, delete it and return the one-line warning to surface. Returns
    /// null when there is nothing to report (no marker, or the owner is still
    /// alive — then the resident is running and the edits are safe in it).
    /// </summary>
    public static string? Consume(string filePath)
    {
        var path = PathFor(filePath);
        Marker? m;
        try
        {
            if (!File.Exists(path)) return null;
            m = Read(path);
        }
        catch { TryDelete(path); return null; }
        if (m == null) { TryDelete(path); return null; }
        if (ProcessIsAlive(m.Pid, m.Started)) return null;
        TryDelete(path);
        return $"A previous session on {Path.GetFileName(m.File)} ended without flushing; edits made after "
             + $"{m.LastMutation:yyyy-MM-ddTHH:mm:ssZ} may be lost. The file on disk is the last flushed version.";
    }

    /// <summary>Drop markers whose owner is gone and that nobody has opened for a week.</summary>
    public static void SweepStale()
    {
        try
        {
            if (!System.IO.Directory.Exists(Directory)) return;
            foreach (var f in System.IO.Directory.EnumerateFiles(Directory, "*.dirty"))
            {
                try
                {
                    if (DateTime.UtcNow - File.GetLastWriteTimeUtc(f) < StaleAfter) continue;
                    var m = Read(f);
                    if (m == null || !ProcessIsAlive(m.Pid, m.Started)) File.Delete(f);
                }
                catch { TryDelete(f); }
            }
        }
        catch { }
    }

    private static bool ProcessIsAlive(int pid, DateTime started)
    {
        if (pid == Environment.ProcessId) return true;
        try
        {
            using var p = Process.GetProcessById(pid);
            if (p.HasExited) return false;
            // pid reuse: a different process that inherited the number started
            // later than the resident that wrote the marker.
            try { return Math.Abs((p.StartTime.ToUniversalTime() - started).TotalMinutes) < 2; }
            catch { return true; }
        }
        catch { return false; }
    }

    private static void TryDelete(string path) { try { File.Delete(path); } catch { } }
}
