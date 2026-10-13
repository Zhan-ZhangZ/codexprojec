// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using System;

namespace OfficeCli.Core;

/// <summary>Which step of a native render failed.</summary>
internal enum NativeRenderStage
{
    /// <summary>The application could not be started (absent, unregistered, or not the expected app).</summary>
    Launch,
    /// <summary>The application started but could not open the document.</summary>
    Open,
    /// <summary>The document opened but exporting it failed or produced nothing.</summary>
    Render,
    /// <summary>The render did not finish within its time budget.</summary>
    Timeout,
}

/// <summary>Tags an exception with the native render step it came from.</summary>
internal sealed class NativeRenderStageException(NativeRenderStage stage, Exception inner)
    : Exception(inner.Message, inner)
{
    public NativeRenderStage Stage { get; } = stage;
}

/// <summary>
/// Why a native render returned no image. Lets <c>--render native</c> report the
/// actual cause instead of assuming the application is not installed.
/// </summary>
internal sealed record NativeRenderFailure(NativeRenderStage Stage, string? Detail)
{
    public static NativeRenderFailure FromException(Exception e) => e is NativeRenderStageException s
        ? new(s.Stage, Describe(s.InnerException ?? s))
        : new(NativeRenderStage.Render, Describe(e));

    public static NativeRenderFailure TimedOut(int ms) => new(NativeRenderStage.Timeout, $"no result after {ms / 1000}s");

    public static NativeRenderFailure NothingRendered() => new(NativeRenderStage.Render, "no pages were produced");

    static string Describe(Exception e) => $"{e.GetType().Name}: {e.Message}";

    /// <summary>
    /// Build the error for an explicit <c>--render native</c> that produced no image.
    /// <paramref name="failure"/> is null when the native path was never attempted
    /// (non-Windows), which reports the same as a launch failure.
    /// </summary>
    public static CliException ToCliException(string app, NativeRenderFailure? failure)
    {
        var detail = failure?.Detail is { Length: > 0 } d ? $" Last error: {d}" : "";
        return (failure?.Stage ?? NativeRenderStage.Launch) switch
        {
            NativeRenderStage.Open => new CliException($"--render native: Microsoft {app} could not open the file.{detail}")
            {
                Code = "native_open_failed",
                Suggestion = $"{app} is available, so the file itself is the likely cause (locked, corrupt, or unsupported). Use --render html or --render auto.",
            },
            NativeRenderStage.Render => new CliException($"--render native: Microsoft {app} opened the file but rendering failed.{detail}")
            {
                Code = "native_render_failed",
                Suggestion = "Use --render html or --render auto.",
            },
            NativeRenderStage.Timeout => new CliException($"--render native: Microsoft {app} did not finish rendering in time.{detail}")
            {
                Code = "native_render_timeout",
                Suggestion = "Retry, or use --render html or --render auto.",
            },
            _ => new CliException($"--render native requires Windows with Microsoft {app} installed.{detail}")
            {
                Code = "native_unavailable",
                Suggestion = "Use --render html or --render auto.",
            },
        };
    }
}
