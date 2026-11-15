using System.Collections;
using System.Collections.Generic;
using System.Text;

namespace CorelMcp.Json
{
    /// <summary>A JSON array.</summary>
    public sealed class JsonArray : JsonValue, IEnumerable<JsonValue>
    {
        private readonly List<JsonValue> _items = new List<JsonValue>();

        public JsonArray() { }

        public JsonArray(IEnumerable<JsonValue> items)
        {
            if (items != null) _items.AddRange(items);
        }

        public JsonArray(IEnumerable<string> items)
        {
            if (items != null)
            {
                foreach (var item in items) _items.Add(item);
            }
        }

        public JsonArray(params JsonValue[] items)
        {
            if (items != null) _items.AddRange(items);
        }

        public override JsonType Type { get { return JsonType.Array; } }

        public override int Count { get { return _items.Count; } }

        public override JsonValue this[int index]
        {
            get { return _items[index]; }
        }

        public override void Add(JsonValue item)
        {
            _items.Add(item ?? Null);
        }

        public IEnumerator<JsonValue> GetEnumerator()
        {
            return _items.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return _items.GetEnumerator();
        }

        protected override object RawValue { get { return null; } }

        public override string AsString()
        {
            return ToString(false);
        }

        internal override void Write(StringBuilder builder, bool indented, int depth)
        {
            if (_items.Count == 0)
            {
                builder.Append("[]");
                return;
            }

            builder.Append('[');
            for (int i = 0; i < _items.Count; i++)
            {
                if (i > 0) builder.Append(',');
                if (indented) JsonText.NewLine(builder, depth + 1);

                var item = _items[i] ?? Null;
                item.Write(builder, indented, depth + 1);
            }

            if (indented) JsonText.NewLine(builder, depth);
            builder.Append(']');
        }
    }
}
