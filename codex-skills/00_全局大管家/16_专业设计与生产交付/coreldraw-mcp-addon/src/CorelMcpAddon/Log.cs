using System;
using System.Collections.Generic;
using System.IO;

namespace CorelMcp
{
    /// <summary>
    /// Minimal thread-safe logger. Writes to corelmcp.log next to the add-on and raises
    /// <see cref="OnLog"/> so the docker UI can display live output.
    /// </summary>
    public static class Log
    {
        private const int MaxInMemory = 500;
        private static readonly object Gate = new object();
        private static readonly Queue<string> Recent = new Queue<string>();
        private static readonly string LogPath;

        /// <summary>
        /// Where the log goes once the add-on directory turns out to be read-only. The add-on
        /// lives under Program Files, which the running application cannot write to, so without
        /// this fallback a startup failure leaves no trace at all.
        /// </summary>
        private static readonly string FallbackPath;
        private static bool _addonDirWritable = true;

        public static event Action<string> OnLog;

        static Log()
        {
            try
            {
                LogPath = Path.Combine(Config.AddonConfig.AddonDirectory, "corelmcp.log");
            }
            catch
            {
                LogPath = null;
            }

            try
            {
                var dir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CorelMcp");
                Directory.CreateDirectory(dir);
                FallbackPath = Path.Combine(dir, "corelmcp.log");
            }
            catch
            {
                FallbackPath = Path.Combine(Path.GetTempPath(), "corelmcp.log");
            }
        }

        /// <summary>Path of the file the log is actually written to; for diagnostics.</summary>
        public static string CurrentPath { get { return _addonDirWritable ? LogPath : FallbackPath; } }

        public static void Info(string message) { Write("INFO", message); }
        public static void Warn(string message) { Write("WARN", message); }
        public static void Error(string message) { Write("ERROR", message); }

        public static void Error(string message, Exception ex)
        {
            Write("ERROR", message + " :: " + (ex == null ? "(null)" : ex.ToString()));
        }

        public static string[] Snapshot()
        {
            lock (Gate) { return Recent.ToArray(); }
        }

        private static void Write(string level, string message)
        {
            string line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + " [" + level + "] " + message;

            lock (Gate)
            {
                Recent.Enqueue(line);
                while (Recent.Count > MaxInMemory) Recent.Dequeue();

                if (_addonDirWritable && LogPath != null)
                {
                    try { File.AppendAllText(LogPath, line + Environment.NewLine); }
                    catch
                    {
                        // Program Files is read-only for the running app; switch to the fallback
                        // once and stay there, instead of failing on every single line.
                        _addonDirWritable = false;
                        try { File.AppendAllText(FallbackPath, line + Environment.NewLine); } catch { }
                    }
                }
                else
                {
                    try { File.AppendAllText(FallbackPath, line + Environment.NewLine); } catch { }
                }
            }

            var handler = OnLog;
            if (handler != null)
            {
                try { handler(line); } catch { /* UI handler must never break logging */ }
            }
        }
    }
}
