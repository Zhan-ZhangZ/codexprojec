using CorelMcp.Json;

namespace CorelMcp.Mcp
{
    /// <summary>JSON-RPC 2.0 request envelope.</summary>
    public class JsonRpcRequest
    {
        public string JsonRpc { get; set; }

        /// <summary>Call id. Null for notifications.</summary>
        public JsonValue Id { get; set; }

        public string Method { get; set; }

        public JsonValue Params { get; set; }

        /// <summary>True for JSON-RPC notifications (no id => no response).</summary>
        public bool IsNotification { get { return Id == null || Id.Type == JsonType.Null; } }

        /// <summary>Read a request envelope from a parsed JSON value.</summary>
        public static JsonRpcRequest FromJson(JsonValue json)
        {
            if (json == null || json.Type != JsonType.Object) return null;

            return new JsonRpcRequest
            {
                JsonRpc = Text(json["jsonrpc"]),
                Id = json["id"],
                Method = Text(json["method"]),
                Params = json["params"]
            };
        }

        private static string Text(JsonValue value)
        {
            return value == null || value.Type == JsonType.Null ? null : value.AsString();
        }
    }

    /// <summary>JSON-RPC 2.0 error object.</summary>
    public class JsonRpcError
    {
        public int Code { get; set; }
        public string Message { get; set; }
        public JsonValue Data { get; set; }

        public JsonRpcError() { }

        public JsonRpcError(int code, string message, JsonValue data = null)
        {
            Code = code;
            Message = message;
            Data = data;
        }

        public JsonObject ToJson()
        {
            var json = new JsonObject
            {
                ["code"] = Code,
                ["message"] = Message ?? string.Empty
            };
            if (Data != null && Data.Type != JsonType.Null) json["data"] = Data;
            return json;
        }
    }

    /// <summary>JSON-RPC 2.0 response envelope.</summary>
    public class JsonRpcResponse
    {
        public string JsonRpc = "2.0";

        public JsonValue Id { get; set; }
        public JsonValue Result { get; set; }
        public JsonRpcError Error { get; set; }

        public static JsonRpcResponse Ok(JsonValue id, JsonValue result)
        {
            return new JsonRpcResponse { Id = id, Result = result };
        }

        public static JsonRpcResponse Fail(JsonValue id, JsonRpcError error)
        {
            return new JsonRpcResponse { Id = id, Error = error };
        }

        public JsonObject ToJson()
        {
            var json = new JsonObject
            {
                ["jsonrpc"] = JsonRpc,
                // "id" is always present: JSON-RPC requires null for unparseable requests.
                ["id"] = Id ?? JsonValue.Null
            };

            if (Result != null) json["result"] = Result;
            if (Error != null) json["error"] = Error.ToJson();

            return json;
        }
    }

    /// <summary>Standard JSON-RPC and MCP error codes.</summary>
    public static class JsonRpcErrors
    {
        public const int ParseError = -32700;
        public const int InvalidRequest = -32600;
        public const int MethodNotFound = -32601;
        public const int InvalidParams = -32602;
        public const int InternalError = -32603;
    }
}
