using System;
using System.Globalization;
using System.Text;

namespace CorelMcp.Json
{
    /// <summary>
    /// Minimal, dependency-free JSON value. Deliberately covers only what the MCP server
    /// needs, so the add-on ships no third-party assembly.
    /// </summary>
    public abstract class JsonValue
    {
        /// <summary>
        /// Maximum nesting depth accepted by the parser. Guards against stack exhaustion
        /// from a hostile request body.
        /// </summary>
        public const int MaxDepth = 64;

        public abstract JsonType Type { get; }

        /// <summary>Number of members (object) or items (array); 0 for primitives.</summary>
        public virtual int Count { get { return 0; } }

        /// <summary>The JSON null literal.</summary>
        public static JsonValue Null { get { return JsonLeaf.NullValue; } }

        /// <summary>Object member access. Returns null when the member is absent.</summary>
        public virtual JsonValue this[string key]
        {
            get { return null; }
            set { throw new NotSupportedException("A JSON " + Type + " has no named members."); }
        }

        /// <summary>Array item access.</summary>
        public virtual JsonValue this[int index]
        {
            get { throw new NotSupportedException("A JSON " + Type + " is not indexable by position."); }
        }

        public virtual void Add(JsonValue item)
        {
            throw new NotSupportedException("A JSON " + Type + " cannot contain items.");
        }

        /// <summary>
        /// Parse a JSON document. Throws <see cref="JsonParseException"/> on malformed input.
        /// </summary>
        public static JsonValue Parse(string json)
        {
            return JsonParser.Parse(json);
        }

        public override string ToString()
        {
            return ToString(false);
        }

        public string ToString(bool indented)
        {
            var builder = new StringBuilder();
            Write(builder, indented, 0);
            return builder.ToString();
        }

        public string ToString(JsonFormatting formatting)
        {
            return ToString(formatting == JsonFormatting.Indented);
        }

        /// <summary>
        /// Raw text of a primitive: strings are returned without surrounding quotes,
        /// numbers and booleans as their literal form. Containers return compact JSON.
        /// </summary>
        public abstract string AsString();

        /// <summary>Backing CLR value of a primitive; null for containers.</summary>
        protected abstract object RawValue { get; }

        /// <summary>Read a primitive as <typeparamref name="T"/>.</summary>
        public T Value<T>()
        {
            if (Type == JsonType.Object || Type == JsonType.Array)
                throw new InvalidCastException("Cannot read a JSON " + Type + " as " + typeof(T).Name + ".");

            if (typeof(T) == typeof(string)) return (T)(object)AsString();

            var raw = RawValue;
            if (raw == null) return default(T);

            if (typeof(T) == typeof(double)) return (T)(object)Convert.ToDouble(raw, CultureInfo.InvariantCulture);
            if (typeof(T) == typeof(int)) return (T)(object)Convert.ToInt32(raw, CultureInfo.InvariantCulture);
            if (typeof(T) == typeof(long)) return (T)(object)Convert.ToInt64(raw, CultureInfo.InvariantCulture);
            if (typeof(T) == typeof(bool)) return (T)(object)Convert.ToBoolean(raw, CultureInfo.InvariantCulture);

            return (T)Convert.ChangeType(raw, typeof(T), CultureInfo.InvariantCulture);
        }

        internal abstract void Write(StringBuilder builder, bool indented, int depth);

        // ---- implicit conversions so JSON can be built with object-initialiser syntax ----

        public static implicit operator JsonValue(string value)
        {
            return value == null ? JsonLeaf.NullValue : JsonLeaf.String(value);
        }

        public static implicit operator JsonValue(bool value) { return JsonLeaf.Boolean(value); }
        public static implicit operator JsonValue(int value) { return JsonLeaf.Integer(value); }
        public static implicit operator JsonValue(long value) { return JsonLeaf.Integer(value); }
        public static implicit operator JsonValue(double value) { return JsonLeaf.Float(value); }
        public static implicit operator JsonValue(float value) { return JsonLeaf.Float(value); }

        public static implicit operator JsonValue(bool? value)
        {
            return value.HasValue ? JsonLeaf.Boolean(value.Value) : JsonLeaf.NullValue;
        }

        public static implicit operator JsonValue(int? value)
        {
            return value.HasValue ? JsonLeaf.Integer(value.Value) : JsonLeaf.NullValue;
        }

        public static implicit operator JsonValue(long? value)
        {
            return value.HasValue ? JsonLeaf.Integer(value.Value) : JsonLeaf.NullValue;
        }

        public static implicit operator JsonValue(double? value)
        {
            return value.HasValue ? JsonLeaf.Float(value.Value) : JsonLeaf.NullValue;
        }
    }
}
