using System;
using System.Collections.Generic;
using System.Text;

namespace CorelMcp.Json
{
    /// <summary>A JSON object. Member order is preserved as inserted.</summary>
    public sealed class JsonObject : JsonValue
    {
        private readonly List<string> _order = new List<string>();
        private readonly Dictionary<string, JsonValue> _members =
            new Dictionary<string, JsonValue>(StringComparer.Ordinal);

        public override JsonType Type { get { return JsonType.Object; } }

        public override int Count { get { return _order.Count; } }

        public IReadOnlyList<string> Keys { get { return _order; } }

        public override JsonValue this[string key]
        {
            get
            {
                JsonValue value;
                if (key != null && _members.TryGetValue(key, out value)) return value;
                return null;
            }
            set
            {
                if (key == null) throw new ArgumentNullException("key");
                if (!_members.ContainsKey(key)) _order.Add(key);
                _members[key] = value ?? Null;
            }
        }

        public bool ContainsKey(string key)
        {
            return key != null && _members.ContainsKey(key);
        }

        /// <summary>Case-insensitive member lookup, used for lenient config parsing.</summary>
        public bool TryGetIgnoreCase(string key, out JsonValue value)
        {
            value = null;
            if (key == null) return false;
            if (_members.TryGetValue(key, out value)) return true;

            foreach (var candidate in _order)
            {
                if (string.Equals(candidate, key, StringComparison.OrdinalIgnoreCase))
                {
                    value = _members[candidate];
                    return true;
                }
            }
            value = null;
            return false;
        }

        /// <summary>
        /// Parse a document that must be a JSON object. Intentionally shadows
        /// <see cref="JsonValue.Parse"/> to return the stronger type.
        /// </summary>
        public new static JsonObject Parse(string json)
        {
            var value = JsonValue.Parse(json) as JsonObject;
            if (value == null)
                throw new JsonParseException("Expected a JSON object at the top level.");
            return value;
        }

        protected override object RawValue { get { return null; } }

        public override string AsString()
        {
            return ToString(false);
        }

        internal override void Write(StringBuilder builder, bool indented, int depth)
        {
            if (_order.Count == 0)
            {
                builder.Append("{}");
                return;
            }

            builder.Append('{');
            for (int i = 0; i < _order.Count; i++)
            {
                if (i > 0) builder.Append(',');
                if (indented) JsonText.NewLine(builder, depth + 1);

                JsonText.WriteString(builder, _order[i]);
                builder.Append(':');
                if (indented) builder.Append(' ');

                var member = _members[_order[i]] ?? Null;
                member.Write(builder, indented, depth + 1);
            }

            if (indented) JsonText.NewLine(builder, depth);
            builder.Append('}');
        }
    }
}
