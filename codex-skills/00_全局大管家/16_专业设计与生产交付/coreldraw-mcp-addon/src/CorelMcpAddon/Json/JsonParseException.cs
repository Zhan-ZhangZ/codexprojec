using System;

namespace CorelMcp.Json
{
    /// <summary>Thrown when a JSON document is malformed, too deeply nested or truncated.</summary>
    public class JsonParseException : Exception
    {
        public JsonParseException(string message) : base(message) { }

        public JsonParseException(string message, Exception inner) : base(message, inner) { }
    }
}
