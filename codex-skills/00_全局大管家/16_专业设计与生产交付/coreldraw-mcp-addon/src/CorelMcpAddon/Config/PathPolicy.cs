using System;
using System.Collections.Generic;
using System.IO;
using CorelMcp.Tools;

namespace CorelMcp.Config
{
    /// <summary>
    /// Enforces <see cref="AddonConfig.AllowedRoots"/> for tool arguments that carry a file path.
    /// The check is lexical: <see cref="Path.GetFullPath(string)"/> resolves "..", relative
    /// segments and mixed separators before the comparison, but symlinks and junctions are not
    /// followed. That keeps an agent from reading or writing outside the directories the user
    /// allowed; it is not a defence against a local attacker who already has the file rights of
    /// the CorelDRAW process.
    /// </summary>
    public static class PathPolicy
    {
        /// <summary>
        /// Canonicalise <paramref name="path"/> and, when AllowedRoots is set, require it to sit
        /// inside one of the roots. Throws <see cref="ToolArgumentException"/> — call this before
        /// <c>CorelBridge.Run</c> so the error reaches the tool-argument branch of the protocol
        /// layer instead of being wrapped as a COM failure.
        /// </summary>
        public static string EnsureAllowed(string path, string argumentName)
        {
            return EnsureAllowed(path, argumentName, AddonConfig.Current);
        }

        /// <summary>Same as the two-argument overload, against an explicit configuration.</summary>
        public static string EnsureAllowed(string path, string argumentName, AddonConfig config)
        {
            var name = string.IsNullOrEmpty(argumentName) ? "path" : argumentName;
            if (string.IsNullOrWhiteSpace(path))
                throw new ToolArgumentException("'" + name + "' is required.");

            string full;
            try
            {
                full = Path.GetFullPath(path.Trim().Trim('"'));
            }
            catch (Exception ex)
            {
                throw new ToolArgumentException("'" + name + "' is not a valid path: " + ex.Message);
            }

            var roots = config == null ? new string[0] : AllowedRoots(config);
            if (roots.Length == 0) return full;

            foreach (var root in roots)
            {
                if (IsInside(full, root)) return full;
            }

            throw new ToolArgumentException(
                "'" + name + "' is outside AllowedRoots: '" + full + "'. Allowed roots: " +
                string.Join(", ", roots) + ".");
        }

        /// <summary>
        /// True when <paramref name="path"/> is <paramref name="root"/> itself or sits below it.
        /// The trailing separator in the prefix keeps "C:\out2" from matching the root "C:\out".
        /// </summary>
        private static bool IsInside(string path, string root)
        {
            if (string.Equals(path, root, StringComparison.OrdinalIgnoreCase)) return true;
            return path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Canonical, separator-trimmed roots; blank and unparsable entries are dropped.</summary>
        private static string[] AllowedRoots(AddonConfig config)
        {
            var roots = new List<string>();
            foreach (var part in config.AllowedRootNames())
            {
                string root;
                try { root = Path.GetFullPath(part); }
                catch (Exception ex)
                {
                    Log.Warn("Ignoring AllowedRoots entry '" + part + "': " + ex.Message);
                    continue;
                }
                root = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                if (root.Length > 0) roots.Add(root);
            }
            return roots.ToArray();
        }
    }
}
