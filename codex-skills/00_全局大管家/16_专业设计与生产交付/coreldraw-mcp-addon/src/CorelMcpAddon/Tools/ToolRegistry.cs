using System;
using System.Collections.Generic;
using System.Linq;
using CorelMcp.Json;

namespace CorelMcp.Tools
{
    /// <summary>Describes one MCP tool: metadata + JSON Schema + handler.</summary>
    public class ToolDescriptor
    {
        public string Name;
        public string Description;
        public JsonObject InputSchema;
        public Func<JsonObject, JsonValue> Handler;

        public JsonObject ToJson()
        {
            return new JsonObject
            {
                ["name"] = Name,
                ["description"] = Description,
                ["inputSchema"] = InputSchema
            };
        }
    }

    /// <summary>Name -> tool descriptor registry.</summary>
    public class ToolRegistry
    {
        private readonly Dictionary<string, ToolDescriptor> _tools =
            new Dictionary<string, ToolDescriptor>(StringComparer.Ordinal);

        public void Add(ToolDescriptor tool)
        {
            if (tool == null) throw new ArgumentNullException("tool");
            _tools[tool.Name] = tool;
        }

        public void Define(string name, string description, JsonObject schema, Func<JsonObject, JsonValue> handler)
        {
            Add(new ToolDescriptor
            {
                Name = name,
                Description = description,
                InputSchema = schema ?? new JsonObject { ["type"] = "object", ["properties"] = new JsonObject() },
                Handler = handler
            });
        }

        public bool TryGet(string name, out ToolDescriptor tool)
        {
            return _tools.TryGetValue(name ?? string.Empty, out tool);
        }

        public IReadOnlyList<ToolDescriptor> List()
        {
            return _tools.Values.OrderBy(t => t.Name, StringComparer.Ordinal).ToList();
        }

        public JsonArray ListAsJson()
        {
            var array = new JsonArray();
            foreach (var tool in List()) array.Add(tool.ToJson());
            return array;
        }
    }

    /// <summary>Helpers for reading typed values out of a tool-call arguments object.</summary>
    public static class ToolArgs
    {
        public static JsonObject Object(JsonObject args)
        {
            return args ?? new JsonObject();
        }

        private static JsonValue Require(JsonObject args, string name)
        {
            var token = args?[name];
            if (token == null || token.Type == JsonType.Null)
                throw new ToolArgumentException("Missing required argument '" + name + "'.");
            return token;
        }

        public static double Number(JsonObject args, string name)
        {
            var token = Require(args, name);
            if (token.Type == JsonType.Integer || token.Type == JsonType.Float)
                return token.Value<double>();
            double parsed;
            if (double.TryParse(token.AsString(), System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out parsed))
                return parsed;
            throw new ToolArgumentException("Argument '" + name + "' must be a number.");
        }

        public static double Number(JsonObject args, string name, double fallback)
        {
            var token = args?[name];
            if (token == null || token.Type == JsonType.Null) return fallback;
            return Number(args, name);
        }

        public static string String(JsonObject args, string name)
        {
            var token = Require(args, name);
            return token.AsString();
        }

        public static string String(JsonObject args, string name, string fallback)
        {
            var token = args?[name];
            if (token == null || token.Type == JsonType.Null) return fallback;
            var value = token.AsString();
            return string.IsNullOrEmpty(value) ? fallback : value;
        }

        public static bool Bool(JsonObject args, string name, bool fallback)
        {
            var token = args?[name];
            if (token == null || token.Type == JsonType.Null) return fallback;
            if (token.Type == JsonType.Boolean) return token.Value<bool>();
            bool parsed;
            if (bool.TryParse(token.AsString(), out parsed)) return parsed;
            return fallback;
        }

        public static int Int(JsonObject args, string name, int fallback)
        {
            var token = args?[name];
            if (token == null || token.Type == JsonType.Null) return fallback;
            return (int)Math.Round(token.Value<double>());
        }
    }

    /// <summary>Thrown for invalid tool arguments; surfaced as an MCP tool error.</summary>
    public class ToolArgumentException : Exception
    {
        public ToolArgumentException(string message) : base(message) { }
    }

    /// <summary>Builders for small JSON Schema fragments used by tool definitions.</summary>
    public static class Schema
    {
        /// <summary>An object schema from explicit properties plus a list of required names.</summary>
        public static JsonObject Object(JsonObject properties, params string[] required)
        {
            return new JsonObject
            {
                ["type"] = "object",
                ["properties"] = properties ?? new JsonObject(),
                ["required"] = new JsonArray(required ?? new string[0])
            };
        }

        /// <summary>An object schema where every listed property is required.</summary>
        public static JsonObject Required(params (string name, JsonObject schema)[] properties)
        {
            var props = new JsonObject();
            var required = new JsonArray();
            foreach (var (name, schema) in properties)
            {
                props[name] = schema;
                required.Add(name);
            }
            return new JsonObject
            {
                ["type"] = "object",
                ["properties"] = props,
                ["required"] = required
            };
        }

        public static JsonObject Number(string description)
        {
            return new JsonObject { ["type"] = "number", ["description"] = description };
        }

        public static JsonObject Integer(string description)
        {
            return new JsonObject { ["type"] = "integer", ["description"] = description };
        }

        public static JsonObject Str(string description)
        {
            return new JsonObject { ["type"] = "string", ["description"] = description };
        }

        public static JsonObject Bool(string description)
        {
            return new JsonObject { ["type"] = "boolean", ["description"] = description };
        }

        /// <summary>An array of plain numbers, e.g. a batch of guide positions or shape indices.</summary>
        public static JsonObject NumberArray(string description)
        {
            return new JsonObject
            {
                ["type"] = "array",
                ["description"] = description,
                ["items"] = new JsonObject { ["type"] = "number" }
            };
        }

        /// <summary>An array of points, each an [x, y] pair or a named point object.</summary>
        public static JsonObject PointArray(string description)
        {
            return new JsonObject
            {
                ["type"] = "array",
                ["description"] = description,
                ["items"] = PointElement()
            };
        }

        /// <summary>A single point, either an [x, y] pair or a named point object.</summary>
        public static JsonObject Point(string description)
        {
            var point = PointElement();
            point["description"] = description;
            return point;
        }

        /// <summary>
        /// A point in either accepted form. The named form additionally carries the Bezier
        /// control points of a path segment.
        /// </summary>
        private static JsonObject PointElement()
        {
            return new JsonObject
            {
                ["anyOf"] = new JsonArray(
                    new JsonObject
                    {
                        ["type"] = "array",
                        ["items"] = new JsonObject { ["type"] = "number" },
                        ["minItems"] = 2
                    },
                    new JsonObject
                    {
                        ["type"] = "object",
                        ["properties"] = new JsonObject
                        {
                            ["x"] = Number("X."),
                            ["y"] = Number("Y."),
                            ["c1x"] = Number("Bezier: incoming control point X."),
                            ["c1y"] = Number("Bezier: incoming control point Y."),
                            ["c2x"] = Number("Bezier: outgoing control point X."),
                            ["c2y"] = Number("Bezier: outgoing control point Y.")
                        },
                        ["required"] = new JsonArray(new JsonValue[] { "x", "y" })
                    })
            };
        }

        /// <summary>Adds optional (non-required) properties to an existing object schema.</summary>
        public static JsonObject WithOptional(this JsonObject schema, params (string name, JsonObject property)[] optional)
        {
            var props = schema["properties"] as JsonObject;
            if (props == null)
            {
                props = new JsonObject();
                schema["properties"] = props;
            }
            foreach (var (name, property) in optional) props[name] = property;
            return schema;
        }

        /// <summary>
        /// Standard "which shapes" selector shared by every tool that acts on existing
        /// shapes. When nothing is given the current selection is used.
        /// </summary>
        public static JsonObject Target()
        {
            return Object(Selector());
        }

        /// <summary>The selector properties shared by every tool that acts on existing shapes.</summary>
        private static readonly string[] SelectorKeys = { "index", "name", "type", "all", "layer", "group" };

        /// <summary>The six selector properties, without the schema wrapper.</summary>
        private static JsonObject Selector()
        {
            return new JsonObject
            {
                ["index"] = Integer("1-based index in the target container (the layer, or the group given in 'group')."),
                ["name"] = Str("Shape name."),
                ["type"] = Str("Shape type: rectangle, ellipse, curve, polygon, text, group, bitmap."),
                ["all"] = Bool("Apply to every object in the target container."),
                ["layer"] = Str("Layer to look in. Default: the active layer."),
                ["group"] = Str("Path of a group to look inside, e.g. \"Group\" or \"Group / Nested\".")
            };
        }

        /// <summary>Schema with the target selector plus extra optional properties.</summary>
        public static JsonObject WithTarget(params (string name, JsonObject property)[] extra)
        {
            var schema = Object(new JsonObject());
            return schema.WithTarget(extra);
        }

        /// <summary>
        /// Adds the standard shape selector and extra optional properties to an existing
        /// object schema (e.g. one built with <see cref="Required"/> that has required fields).
        /// </summary>
        public static JsonObject WithTarget(this JsonObject schema, params (string name, JsonObject property)[] extra)
        {
            var properties = schema["properties"] as JsonObject;
            if (properties == null)
            {
                properties = new JsonObject();
                schema["properties"] = properties;
            }

            var selector = Selector();
            foreach (var key in SelectorKeys)
                properties[key] = selector[key];

            foreach (var (name, property) in extra) properties[name] = property;
            return schema;
        }
    }
}
