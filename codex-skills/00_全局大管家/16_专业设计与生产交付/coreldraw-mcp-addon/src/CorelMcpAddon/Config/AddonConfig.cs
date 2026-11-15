using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using CorelMcp.Json;

namespace CorelMcp.Config
{
    /// <summary>
    /// Add-on configuration, persisted as config.json next to the add-on assembly.
    /// </summary>
    public class AddonConfig
    {
        /// <summary>TCP port the MCP Streamable HTTP endpoint listens on.</summary>
        public int Port { get; set; } = 8765;

        /// <summary>Bind address. Loopback only by design; do not set to 0.0.0.0.</summary>
        public string BindAddress { get; set; } = "127.0.0.1";

        /// <summary>Start the MCP server automatically when CorelDRAW loads the add-on.</summary>
        public bool AutoStart { get; set; } = true;

        /// <summary>
        /// Optional bearer token. When set, every request must carry
        /// "Authorization: Bearer &lt;token&gt;". Null/empty disables the check.
        /// </summary>
        public string AuthToken { get; set; } = "";

        /// <summary>Maximum request body size in bytes.</summary>
        public int MaxBodyBytes { get; set; } = 4 * 1024 * 1024;

        /// <summary>
        /// Comma-separated list of directories that file-path tool arguments are allowed
        /// to point at. Empty means "no restriction" (tools still reject unknown roots
        /// only when this list is non-empty).
        /// </summary>
        public string AllowedRoots { get; set; } = "";

        /// <summary>
        /// Comma-separated names of tools that are hidden from tools/list and rejected by
        /// tools/call. Edited from the tool list in the docker panel.
        /// </summary>
        public string DisabledTools { get; set; } = "";

        /// <summary>Path of the config.json this instance was loaded from. Not persisted.</summary>
        public string ConfigPath { get; private set; }

        /// <summary>
        /// The configuration the add-on loaded at startup. Tools read AllowedRoots from here;
        /// the docker panel edits the same instance, so a change applies without a restart.
        /// </summary>
        public static AddonConfig Current { get; set; }

        /// <summary>The disabled tool names as an array, ignoring blanks.</summary>
        public string[] DisabledToolNames()
        {
            return SplitList(DisabledTools, ',');
        }

        /// <summary>
        /// The AllowedRoots entries as an array, ignoring blanks. Both ',' and ';' separate
        /// entries, because a Windows path list is normally written with semicolons.
        /// </summary>
        public string[] AllowedRootNames()
        {
            return SplitList(AllowedRoots, ',', ';');
        }

        private static string[] SplitList(string value, params char[] separators)
        {
            if (string.IsNullOrEmpty(value)) return new string[0];
            var parts = new List<string>();
            foreach (var part in value.Split(separators))
            {
                var trimmed = part.Trim();
                if (trimmed.Length > 0) parts.Add(trimmed);
            }
            return parts.ToArray();
        }

        /// <summary>Write the current settings back to config.json.</summary>
        public void Save()
        {
            try
            {
                var path = ConfigPath ?? Path.Combine(AddonDirectory, "config.json");
                File.WriteAllText(path, ToJson().ToString(JsonFormatting.Indented));
            }
            catch (Exception ex)
            {
                Log.Warn("Could not write config.json: " + ex.Message);
            }
        }

        public static AddonConfig Load()
        {
            var cfg = new AddonConfig();
            string path = Path.Combine(AddonDirectory, "config.json");
            cfg.ConfigPath = path;
            try
            {
                if (File.Exists(path))
                {
                    var loaded = FromJson(JsonValue.Parse(File.ReadAllText(path)));
                    loaded.ConfigPath = path;
                    if (loaded.Port <= 0 || loaded.Port > 65535) loaded.Port = cfg.Port;
                    if (string.IsNullOrWhiteSpace(loaded.BindAddress)) loaded.BindAddress = cfg.BindAddress;
                    if (loaded.MaxBodyBytes <= 0) loaded.MaxBodyBytes = cfg.MaxBodyBytes;
                    Current = loaded;
                    return loaded;
                }
                else
                {
                    File.WriteAllText(path, cfg.ToJson().ToString(JsonFormatting.Indented));
                }
            }
            catch (Exception ex)
            {
                Log.Warn("Could not read config.json (" + ex.Message + "); using defaults.");
            }
            Current = cfg;
            return cfg;
        }

        /// <summary>Build a configuration from a parsed config.json document.</summary>
        public static AddonConfig FromJson(JsonValue json)
        {
            var config = new AddonConfig();
            var root = json as JsonObject;
            if (root == null) return config;

            config.Port = ReadInt(root, "Port", config.Port);
            config.BindAddress = ReadString(root, "BindAddress", config.BindAddress);
            config.AutoStart = ReadBool(root, "AutoStart", config.AutoStart);
            config.AuthToken = ReadString(root, "AuthToken", config.AuthToken);
            config.MaxBodyBytes = ReadInt(root, "MaxBodyBytes", config.MaxBodyBytes);
            config.AllowedRoots = ReadString(root, "AllowedRoots", config.AllowedRoots);
            config.DisabledTools = ReadString(root, "DisabledTools", config.DisabledTools);
            return config;
        }

        public JsonObject ToJson()
        {
            return new JsonObject
            {
                ["Port"] = Port,
                ["BindAddress"] = BindAddress ?? string.Empty,
                ["AutoStart"] = AutoStart,
                ["AuthToken"] = AuthToken ?? string.Empty,
                ["MaxBodyBytes"] = MaxBodyBytes,
                ["AllowedRoots"] = AllowedRoots ?? string.Empty,
                ["DisabledTools"] = DisabledTools ?? string.Empty
            };
        }

        private static JsonValue Member(JsonObject root, string name)
        {
            JsonValue value;
            return root.TryGetIgnoreCase(name, out value) ? value : null;
        }

        private static int ReadInt(JsonObject root, string name, int fallback)
        {
            var value = Member(root, name);
            if (value == null || value.Type == JsonType.Null) return fallback;
            try { return value.Value<int>(); }
            catch { return fallback; }
        }

        private static bool ReadBool(JsonObject root, string name, bool fallback)
        {
            var value = Member(root, name);
            if (value == null || value.Type == JsonType.Null) return fallback;
            try { return value.Value<bool>(); }
            catch { return fallback; }
        }

        private static string ReadString(JsonObject root, string name, string fallback)
        {
            var value = Member(root, name);
            if (value == null || value.Type == JsonType.Null) return fallback;
            var text = value.AsString();
            return string.IsNullOrEmpty(text) ? fallback : text;
        }

        public string HttpPrefix
        {
            get { return "http://" + BindAddress + ":" + Port + "/"; }
        }

        /// <summary>Directory containing the add-on assembly (the Addons\CorelMcp folder).</summary>
        public static string AddonDirectory
        {
            get
            {
                try
                {
                    return Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                }
                catch
                {
                    return AppDomain.CurrentDomain.BaseDirectory;
                }
            }
        }
    }
}
