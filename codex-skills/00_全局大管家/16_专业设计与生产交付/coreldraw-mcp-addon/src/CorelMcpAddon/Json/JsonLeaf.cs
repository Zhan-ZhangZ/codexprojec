using System.Globalization;
using System.Text;

namespace CorelMcp.Json
{
    /// <summary>A JSON primitive: null, boolean, integer, float or string.</summary>
    internal sealed class JsonLeaf : JsonValue
    {
        public static readonly JsonLeaf NullValue = new JsonLeaf(JsonType.Null, null);

        private readonly JsonType _type;
        private readonly object _value;

        private JsonLeaf(JsonType type, object value)
        {
            _type = type;
            _value = value;
        }

        public static JsonLeaf String(string value) { return new JsonLeaf(JsonType.String, value); }
        public static JsonLeaf Boolean(bool value) { return new JsonLeaf(JsonType.Boolean, value); }
        public static JsonLeaf Integer(long value) { return new JsonLeaf(JsonType.Integer, value); }
        public static JsonLeaf Float(double value) { return new JsonLeaf(JsonType.Float, value); }

        public override JsonType Type { get { return _type; } }

        protected override object RawValue { get { return _value; } }

        public override string AsString()
        {
            switch (_type)
            {
                case JsonType.String: return (string)_value;
                case JsonType.Boolean: return (bool)_value ? "true" : "false";
                case JsonType.Integer: return ((long)_value).ToString(CultureInfo.InvariantCulture);
                case JsonType.Float: return JsonNumber.Format((double)_value);
                default: return string.Empty;
            }
        }

        internal override void Write(StringBuilder builder, bool indented, int depth)
        {
            switch (_type)
            {
                case JsonType.Null:
                    builder.Append("null");
                    break;
                case JsonType.Boolean:
                    builder.Append((bool)_value ? "true" : "false");
                    break;
                case JsonType.Integer:
                    builder.Append(((long)_value).ToString(CultureInfo.InvariantCulture));
                    break;
                case JsonType.Float:
                    builder.Append(JsonNumber.Format((double)_value));
                    break;
                case JsonType.String:
                    JsonText.WriteString(builder, (string)_value);
                    break;
            }
        }
    }
}
