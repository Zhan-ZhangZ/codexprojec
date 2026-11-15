using System;
using System.Collections.Generic;
using CorelMcp.Json;
using System.Diagnostics;
using CorelMcp.Tools;

namespace CorelMcp.Mcp
{
    /// <summary>
    /// Implements the Model Context Protocol method layer on top of the tool registry.
    /// Only JSON-RPC framing and the MCP methods needed for a tool server are handled.
    /// </summary>
    public class McpProtocol
    {
        public const string ServerName = "coreldraw_mcp";
        public const string LatestProtocolVersion = "2025-06-18";

        /// <summary>
        /// The add-on's own version, read from the assembly instead of hard-coded: bug reports
        /// quote <c>server_status</c> → <c>version</c>, so it has to name the build that is
        /// actually running, not a protocol-layer constant that drifts from the package.
        /// </summary>
        public static readonly string ServerVersion = ReadAssemblyVersion();

        private static string ReadAssemblyVersion()
        {
            try
            {
                var version = typeof(McpProtocol).Assembly.GetName().Version;
                return version == null ? "0.0.0" : version.ToString(3);
            }
            catch (Exception ex)
            {
                Log.Warn("Could not read the add-on assembly version: " + ex.Message);
                return "0.0.0";
            }
        }

        private static readonly string[] SupportedVersions =
        {
            "2025-06-18",
            "2025-03-26",
            "2024-11-05"
        };

        private readonly ToolRegistry _tools;
        private readonly object _executionGate = new object();

        /// <summary>
        /// Names hidden from tools/list and rejected by tools/call. Replaced wholesale on every
        /// update so reads from HTTP worker threads never observe a half-updated set.
        /// </summary>
        private volatile HashSet<string> _disabled = new HashSet<string>(StringComparer.Ordinal);

        public string NegotiatedProtocolVersion { get; private set; } = LatestProtocolVersion;

        public McpProtocol(ToolRegistry tools)
        {
            if (tools == null) throw new ArgumentNullException("tools");
            _tools = tools;
        }

        public ToolRegistry Tools { get { return _tools; } }

        /// <summary>Replace the set of disabled tools (called from the docker tool list).</summary>
        public void SetDisabledTools(IEnumerable<string> names)
        {
            var next = new HashSet<string>(StringComparer.Ordinal);
            if (names != null)
            {
                foreach (var name in names)
                {
                    if (!string.IsNullOrEmpty(name)) next.Add(name);
                }
            }
            _disabled = next;
        }

        public IEnumerable<string> DisabledTools { get { return _disabled; } }

        /// <summary>
        /// Dispatch a JSON-RPC request. Returns null for notifications (no response is sent).
        /// </summary>
        public JsonRpcResponse Handle(JsonRpcRequest request)
        {
            if (request == null)
                return JsonRpcResponse.Fail(null, new JsonRpcError(JsonRpcErrors.InvalidRequest, "Empty request."));

            if (request.IsNotification)
            {
                try { Dispatch(request, null); }
                catch (Exception ex) { Log.Warn("Notification '" + request.Method + "' failed: " + ex.Message); }
                return null;
            }

            try
            {
                return JsonRpcResponse.Ok(request.Id, Dispatch(request, request.Id));
            }
            catch (McpMethodException ex)
            {
                return JsonRpcResponse.Fail(request.Id, new JsonRpcError(ex.Code, ex.Message));
            }
            catch (Exception ex)
            {
                Log.Error("Unhandled error in '" + request.Method + "'", ex);
                return JsonRpcResponse.Fail(request.Id,
                    new JsonRpcError(JsonRpcErrors.InternalError, ex.Message));
            }
        }

        private JsonValue Dispatch(JsonRpcRequest request, JsonValue id)
        {
            if (string.IsNullOrEmpty(request.Method))
                throw new McpMethodException(JsonRpcErrors.InvalidRequest, "Missing method.");

            switch (request.Method)
            {
                case "initialize":
                    return Initialize(request.Params);
                case "notifications/initialized":
                case "notifications/cancelled":
                case "notifications/roots/list_changed":
                    return new JsonObject();
                case "ping":
                    return new JsonObject();
                case "tools/list":
                    return ListTools();
                case "tools/call":
                    return CallTool(request.Params);
                default:
                    throw new McpMethodException(JsonRpcErrors.MethodNotFound,
                        "Unknown method '" + request.Method + "'. Supported methods: initialize, tools/list, tools/call.");
            }
        }

        private JsonValue Initialize(JsonValue parameters)
        {
            var clientVersion = parameters?["protocolVersion"]?.AsString();
            if (!string.IsNullOrEmpty(clientVersion) && Array.IndexOf(SupportedVersions, clientVersion) >= 0)
                NegotiatedProtocolVersion = clientVersion;
            else
                NegotiatedProtocolVersion = LatestProtocolVersion;

            var clientName = parameters?["clientInfo"]?["name"]?.AsString() ?? "unknown";
            Log.Info("MCP client '" + clientName + "' initialised (protocol " + NegotiatedProtocolVersion + ").");

            return new JsonObject
            {
                ["protocolVersion"] = NegotiatedProtocolVersion,
                ["capabilities"] = new JsonObject
                {
                    ["tools"] = new JsonObject { ["listChanged"] = false }
                },
                ["serverInfo"] = new JsonObject
                {
                    ["name"] = ServerName,
                    ["version"] = ServerVersion
                }
            };
        }

        private JsonValue ListTools()
        {
            var disabled = _disabled;
            var tools = new JsonArray();
            foreach (var tool in _tools.List())
            {
                if (disabled.Contains(tool.Name)) continue;
                tools.Add(tool.ToJson());
            }
            return new JsonObject { ["tools"] = tools };
        }

        private JsonValue CallTool(JsonValue parameters)
        {
            var name = parameters?["name"]?.AsString();
            if (string.IsNullOrEmpty(name))
                throw new McpMethodException(JsonRpcErrors.InvalidParams, "tools/call requires a tool 'name'.");

            var arguments = parameters?["arguments"] as JsonObject ?? new JsonObject();

            ToolDescriptor tool;
            if (!_tools.TryGet(name, out tool))
                throw new McpMethodException(JsonRpcErrors.InvalidParams, "Unknown tool '" + name + "'. Call tools/list to see the available tools.");
            if (_disabled.Contains(name))
                throw new McpMethodException(JsonRpcErrors.InvalidParams,
                    "Tool '" + name + "' is disabled in the CorelDRAW MCP tool list. Enable it with the Tools button in the docker panel.");
            var stopwatch = Stopwatch.StartNew();
            // Logged before execution on purpose: if CorelDRAW stalls, the log shows which call is responsible.
            Log.Info("--> " + name + Summarize(arguments));

            try
            {
                // Serialise tool execution: CorelDRAW is single-threaded and document edits
                // must not interleave.
                JsonValue result;
                lock (_executionGate)
                {
                    result = tool.Handler(arguments);
                }
            Log.Info("<-- " + name + " ok in " + stopwatch.ElapsedMilliseconds + " ms");
                return ContentResult(result, false);
            }
            catch (ToolArgumentException ex)
            {
                Log.Warn("<-- " + name + " rejected arguments after " + stopwatch.ElapsedMilliseconds + " ms: " + ex.Message);
                return ContentResult(new JsonObject { ["error"] = ex.Message }, true);
            }
            catch (Exception ex)
            {
                Log.Error("<-- " + name + " failed after " + stopwatch.ElapsedMilliseconds + " ms", ex);
                return ContentResult(new JsonObject
                {
                    ["error"] = ex.Message,
                    ["type"] = ex.GetType().Name
                }, true);
            }
        }

        /// <summary>One-line, length-capped rendering of a tool call's arguments for the log.</summary>
        private static string Summarize(JsonValue arguments)
        {
            if (arguments == null || arguments.Type != JsonType.Object || arguments.Count == 0)
                return "()";

            var text = arguments.ToString(JsonFormatting.Compact);
            const int limit = 240;
            if (text.Length > limit) text = text.Substring(0, limit) + "...";
            return text;
        }
        private static JsonValue ContentResult(JsonValue payload, bool isError)
        {
            string text = payload == null
                ? "null"
                : (payload.Type == JsonType.String ? payload.AsString() : payload.ToString(JsonFormatting.Indented));

            var result = new JsonObject
            {
                ["content"] = new JsonArray
                {
                    new JsonObject { ["type"] = "text", ["text"] = text }
                }
            };
            if (isError) result["isError"] = true;
            return result;
        }
    }

    /// <summary>Error carrying a JSON-RPC error code.</summary>
    public class McpMethodException : Exception
    {
        public int Code { get; private set; }

        public McpMethodException(int code, string message) : base(message)
        {
            Code = code;
        }
    }
}

