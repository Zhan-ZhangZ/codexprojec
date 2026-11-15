using System;
using CorelMcp.Json;
using CorelMcp.Config;
using CorelMcp.Tools;

namespace CorelMcp.Mcp
{
    /// <summary>Owns the lifetime of the MCP endpoint inside CorelDRAW.</summary>
    public class McpServer
    {
        private static readonly object Gate = new object();

        private readonly AddonConfig _config;
        private readonly McpProtocol _protocol;
        private readonly HttpServer _http;

        public DateTime StartedAt { get; private set; }

        public static McpServer Instance { get; private set; }

        private McpServer(AddonConfig config)
        {
            _config = config;
            _protocol = new McpProtocol(ToolCatalog.Build());
            _protocol.SetDisabledTools(config.DisabledToolNames());
            _http = new HttpServer(config, _protocol);
        }

        public static McpServer Start(AddonConfig config)
        {
            if (config == null) throw new ArgumentNullException("config");

            lock (Gate)
            {
                if (Instance != null)
                {
                    Log.Info("MCP server already running; ignoring start request.");
                    return Instance;
                }

                var server = new McpServer(config);
                server._http.Start();
                server.StartedAt = DateTime.Now;
                Instance = server;
                Log.Info("MCP server started with " + server._protocol.Tools.List().Count + " tools.");
                return server;
            }
        }

        public static void Stop()
        {
            lock (Gate)
            {
                if (Instance == null) return;
                Instance._http.Stop();
                Instance = null;
            }
        }

        public bool IsRunning { get { return Instance != null; } }

        public string Endpoint { get { return _config.HttpPrefix + "mcp"; } }

        /// <summary>The MCP method layer, so the docker panel can change the enabled tool set.</summary>
        public McpProtocol Protocol { get { return _protocol; } }

        public JsonObject StatusJson()        {
            return new JsonObject
            {
                ["running"] = true,
                ["endpoint"] = Endpoint,
                ["protocolVersion"] = _protocol.NegotiatedProtocolVersion,
                ["server"] = McpProtocol.ServerName,
                ["version"] = McpProtocol.ServerVersion,
                ["toolCount"] = _protocol.Tools.List().Count,
                ["enabledToolCount"] = EnabledToolCount(),
                ["startedAt"] = StartedAt.ToString("o"),
                ["requests"] = _http.RequestCount,
                ["authRequired"] = !string.IsNullOrEmpty(_config.AuthToken),
                ["logPath"] = Log.CurrentPath
            };
        }

        /// <summary>How many registered tools are currently exposed over MCP.</summary>
        private int EnabledToolCount()
        {
            var disabled = _protocol.DisabledTools;
            var count = 0;
            foreach (var tool in _protocol.Tools.List())
            {
                if (!Contains(disabled, tool.Name)) count++;
            }
            return count;
        }

        private static bool Contains(System.Collections.Generic.IEnumerable<string> names, string name)
        {
            foreach (var candidate in names)
            {
                if (string.Equals(candidate, name, StringComparison.Ordinal)) return true;
            }
            return false;
        }
    }
}
