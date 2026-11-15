namespace CorelMcp.Json
{
    /// <summary>
    /// The kind of a <see cref="JsonValue"/>. Integers and floating point numbers are kept
    /// apart on purpose: JSON-RPC ids and coordinates must survive a parse/serialise round
    /// trip unchanged.
    /// </summary>
    public enum JsonType
    {
        Null,
        Boolean,
        Integer,
        Float,
        String,
        Array,
        Object
    }

    /// <summary>Output style for <see cref="JsonValue.ToString(bool)"/>.</summary>
    public enum JsonFormatting
    {
        Compact,
        Indented
    }
}
