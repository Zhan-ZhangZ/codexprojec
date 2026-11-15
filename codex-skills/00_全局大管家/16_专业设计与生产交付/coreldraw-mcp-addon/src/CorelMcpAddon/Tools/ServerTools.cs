using CorelMcp.Json;
using CorelMcp.Mcp;

namespace CorelMcp.Tools
{
    /// <summary>Introspection tools about the MCP server itself.</summary>
    public static class ServerTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "server_status",
                "Report MCP server status: endpoint, protocol version, tool count and uptime.",
                Schema.Object(new JsonObject()),
                args =>
                {
                    var server = McpServer.Instance;
                    if (server == null) return new JsonObject { ["running"] = false };
                    return server.StatusJson();
                });

            registry.Define(
                "server_log",
                "Return the most recent log lines of the add-on: every tool call with its " +
                "arguments and how long it took, plus export and error messages.",
                Schema.Object(new JsonObject())
                      .WithOptional(("lines", Schema.Integer("How many trailing lines to return. Default 50."))),
                args =>
                {
                    var count = ToolArgs.Int(args, "lines", 50);
                    if (count < 1) count = 1;
                    if (count > 500) count = 500;

                    var all = Log.Snapshot();
                    var take = count < all.Length ? count : all.Length;
                    var lines = new JsonArray();
                    for (var i = all.Length - take; i < all.Length; i++) lines.Add(all[i]);

                    return new JsonObject
                    {
                        ["returned"] = take,
                        ["available"] = all.Length,
                        ["lines"] = lines
                    };
                });
        }
    }
}
