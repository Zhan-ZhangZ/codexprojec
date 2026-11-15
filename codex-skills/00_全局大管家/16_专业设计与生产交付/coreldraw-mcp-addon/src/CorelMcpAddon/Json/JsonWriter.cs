using System.Globalization;
using System.Text;

namespace CorelMcp.Json
{
    /// <summary>String escaping and layout helpers shared by the JSON writers.</summary>
    internal static class JsonText
    {
        private const string HexDigits = "0123456789abcdef";

        public static void NewLine(StringBuilder builder, int depth)
        {
            builder.Append('\n');
            builder.Append(' ', depth * 2);
        }

        public static void WriteString(StringBuilder builder, string value)
        {
            builder.Append('"');
            if (value != null)
            {
                foreach (var c in value)
                {
                    switch (c)
                    {
                        case '"': builder.Append("\\\""); break;
                        case '\\': builder.Append("\\\\"); break;
                        case '\b': builder.Append("\\b"); break;
                        case '\f': builder.Append("\\f"); break;
                        case '\n': builder.Append("\\n"); break;
                        case '\r': builder.Append("\\r"); break;
                        case '\t': builder.Append("\\t"); break;
                        default:
                            if (c < ' ')
                            {
                                builder.Append("\\u");
                                builder.Append(HexDigits[(c >> 12) & 0xF]);
                                builder.Append(HexDigits[(c >> 8) & 0xF]);
                                builder.Append(HexDigits[(c >> 4) & 0xF]);
                                builder.Append(HexDigits[c & 0xF]);
                            }
                            else
                            {
                                builder.Append(c);
                            }
                            break;
                    }
                }
            }
            builder.Append('"');
        }
    }

    /// <summary>Invariant-culture number formatting.</summary>
    internal static class JsonNumber
    {
        /// <summary>
        /// Format a double so it is valid JSON and keeps its "float" identity: an integral
        /// value such as 300.0 must not round-trip into the integer 300.
        /// </summary>
        public static string Format(double value)
        {
            // NaN/Infinity have no JSON representation; emit null rather than invalid JSON.
            if (double.IsNaN(value) || double.IsInfinity(value)) return "null";

            var text = value.ToString("R", CultureInfo.InvariantCulture);
            if (text.IndexOf('.') < 0 && text.IndexOf('e') < 0 && text.IndexOf('E') < 0)
                text += ".0";
            return text;
        }
    }
}
