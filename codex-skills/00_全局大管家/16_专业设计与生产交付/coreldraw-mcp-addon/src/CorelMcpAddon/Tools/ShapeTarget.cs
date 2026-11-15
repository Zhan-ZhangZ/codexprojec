using System;
using System.Collections.Generic;
using System.Globalization;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>
    /// Shared helpers for tools that act on existing shapes: resolving which shapes a call
    /// targets, and turning tool arguments into CorelDRAW colours.
    /// </summary>
    public static class ShapeTarget
    {
        /// <summary>
        /// Resolve the shapes a tool call applies to. Runs on the CorelDRAW thread.
        ///
        /// Precedence: explicit index, then name/type/all filters inside the target container
        /// (the layer named by "layer", or the group named by "group", otherwise the active
        /// layer), otherwise the current selection.
        /// </summary>
        public static List<corel.Shape> Resolve(JsonObject args)
        {
            var index = ToolArgs.Int(args, "index", 0);
            var name = ToolArgs.String(args, "name", null);
            var type = ToolArgs.String(args, "type", null);
            var all = ToolArgs.Bool(args, "all", false);

            var hasSelector = index > 0 || all || !string.IsNullOrEmpty(name) || !string.IsNullOrEmpty(type);
            if (!hasSelector) return Selection();

            var group = ToolArgs.String(args, "group", null);
            var layer = ResolveLayer(args);

            if (!string.IsNullOrEmpty(group))
            {
                var container = FindByPath(layer, group);
                return ResolveIn(container.Shapes, "group '" + group + "'", index, name, type);
            }

            return ResolveIn(layer.Shapes, "layer '" + layer.Name + "'", index, name, type);
        }

        /// <summary>
        /// Like <see cref="Resolve"/>, but for tools that need a CorelDRAW selection or a
        /// ShapeRange: CorelDRAW can only put top-level objects into a selection, so objects
        /// inside a group are refused with a clear message instead of a COM failure.
        /// </summary>
        public static List<corel.Shape> ResolveForSelection(JsonObject args)
        {
            var group = ToolArgs.String(args, "group", null);
            if (!string.IsNullOrEmpty(group))
                throw new ToolArgumentException(
                    "Objects inside group '" + group + "' cannot be put into a CorelDRAW selection. " +
                    "Ungroup it first, or address the group itself.");
            return Resolve(args);
        }

        /// <summary>The layer a tool call targets: "layer" when given, otherwise the active one.</summary>
        public static corel.Layer ResolveLayer(JsonObject args)
        {
            var name = ToolArgs.String(args, "layer", null);
            if (!string.IsNullOrEmpty(name)) return LayerTools.FindLayer(name);

            var layer = DocumentTools.RequireActiveDocument().ActiveLayer;
            if (layer == null) throw new InvalidOperationException("The active document has no active layer.");
            return layer;
        }

        /// <summary>
        /// Walk a "A / B" group path down from the layer's own objects. Every element is either
        /// an object name or "[n]" for the n-th object of the container, which is how
        /// list_objects reports objects that carry no name.
        /// </summary>
        public static corel.Shape FindByPath(corel.Layer layer, string path)
        {
            if (layer == null) throw new InvalidOperationException("The active document has no active layer.");

            corel.Shape current = null;
            var shapes = layer.Shapes;
            foreach (var element in SplitPath(path))
            {
                current = FindIn(shapes, element);
                if (current == null)
                    throw new ToolArgumentException("No object '" + element + "' in path '" + path + "'.");
                shapes = current.Shapes;
            }

            if (current == null) throw new ToolArgumentException("'group' path is empty.");
            return current;
        }

        /// <summary>Split "A / B" into its elements, dropping empty segments.</summary>
        public static List<string> SplitPath(string path)
        {
            var parts = new List<string>();
            foreach (var raw in (path ?? string.Empty).Split('/'))
            {
                var piece = raw.Trim();
                if (piece.Length > 0) parts.Add(piece);
            }
            return parts;
        }

        private static corel.Shape FindIn(corel.Shapes shapes, string element)
        {
            int count = shapes.Count;

            // "[3]" addresses the third object of the container, for objects with no name.
            if (element.Length > 2 && element[0] == '[' && element[element.Length - 1] == ']')
            {
                int index;
                if (int.TryParse(element.Substring(1, element.Length - 2), out index) &&
                    index >= 1 && index <= count)
                    return shapes[index];
                return null;
            }

            for (var i = 1; i <= count; i++)
            {
                corel.Shape shape = null;
                try { shape = shapes[i]; } catch { }
                if (shape != null && string.Equals(shape.Name, element, StringComparison.Ordinal)) return shape;
            }
            return null;
        }

        private static List<corel.Shape> ResolveIn(corel.Shapes shapes, string where, int index, string name, string type)
        {
            var result = new List<corel.Shape>();
            int count = shapes.Count;

            if (index > 0)
            {
                if (index > count)
                    throw new ToolArgumentException(
                        "No shape at index " + index + " in " + where + " (" + count + " objects).");
                result.Add(shapes[index]);
                return result;
            }

            for (var i = 1; i <= count; i++)
            {
                corel.Shape shape = null;
                try { shape = shapes[i]; } catch { }
                if (shape == null) continue;

                if (!string.IsNullOrEmpty(name) &&
                    !string.Equals(shape.Name, name, StringComparison.Ordinal)) continue;

                if (!string.IsNullOrEmpty(type) &&
                    !string.Equals(CorelJson.ShapeTypeName(shape.Type), type, StringComparison.OrdinalIgnoreCase)) continue;

                result.Add(shape);
            }

            if (result.Count == 0) throw new ToolArgumentException("No shapes matched in " + where + ".");
            return result;
        }

        /// <summary>The current selection, as a list.</summary>
        private static List<corel.Shape> Selection()
        {
            var result = new List<corel.Shape>();
            var doc = DocumentTools.RequireActiveDocument();
            var range = doc.SelectionRange;
            if (range != null && range.Count > 0)
            {
                for (var i = 1; i <= range.Count; i++)
                {
                    corel.Shape shape = null;
                    try { shape = range[i]; } catch { }
                    if (shape != null) result.Add(shape);
                }
            }

            if (result.Count == 0)
                throw new ToolArgumentException(
                    "Nothing selected and no 'index', 'name', 'type' or 'all' given. " +
                    "Select shapes in CorelDRAW, or pass a selector.");

            return result;
        }

        /// <summary>Build a ShapeRange from shapes so boolean/group operations can be used.</summary>
        public static corel.ShapeRange ToRange(List<corel.Shape> shapes)
        {
            var range = CorelBridge.Application.CreateShapeRange();
            foreach (var shape in shapes) range.Add(shape);
            return range;
        }

        /// <summary>
        /// Parse a colour from tool arguments. Accepted forms:
        ///   "color": "#RRGGBB" (or "RRGGBB"), "cmyk": "C,M,Y,K", "gray": 0-100.
        /// </summary>
        public static corel.Color ResolveColor(JsonObject args)
        {
            var app = CorelBridge.Application;

            var cmyk = ToolArgs.String(args, "cmyk", null);
            if (!string.IsNullOrEmpty(cmyk))
            {
                var parts = cmyk.Split(',');
                if (parts.Length != 4)
                    throw new ToolArgumentException("'cmyk' must be four values, e.g. \"0,80,60,10\".");
                return app.CreateCMYKColor(
                    ParsePercent(parts[0], "cmyk"), ParsePercent(parts[1], "cmyk"),
                    ParsePercent(parts[2], "cmyk"), ParsePercent(parts[3], "cmyk"));
            }

            if (args.ContainsKey("gray"))
            {
                return app.CreateGrayColor(ParsePercent(ToolArgs.Number(args, "gray").ToString(CultureInfo.InvariantCulture), "gray"));
            }

            var hex = ToolArgs.String(args, "color", null);
            if (!string.IsNullOrEmpty(hex))
            {
                var text = hex.Trim().TrimStart('#');
                if (text.Length == 3)
                    text = new string(new[] { text[0], text[0], text[1], text[1], text[2], text[2] });
                if (text.Length != 6)
                    throw new ToolArgumentException("'color' must be hex like \"#FFCC00\" or \"FFCC00\".");

                int r, g, b;
                try
                {
                    r = int.Parse(text.Substring(0, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
                    g = int.Parse(text.Substring(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
                    b = int.Parse(text.Substring(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
                }
                catch (FormatException)
                {
                    throw new ToolArgumentException("'color' must be hex like \"#FFCC00\".");
                }
                return app.CreateRGBColor(r, g, b);
            }

            throw new ToolArgumentException("No colour given. Use 'color' (hex), 'cmyk' (\"C,M,Y,K\") or 'gray' (0-100).");
        }

        private static int ParsePercent(string text, string source)
        {
            int value;
            if (!int.TryParse(text.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
                throw new ToolArgumentException("'" + source + "' contains a non-numeric value: \"" + text + "\".");
            if (value < 0) value = 0;
            if (value > 100) value = 100;
            return value;
        }

        /// <summary>
        /// Copy of <paramref name="args"/> with the value of <paramref name="key"/> exposed
        /// under "color", so a tool can read a differently named colour argument.
        /// </summary>
        public static JsonObject WithColor(JsonObject args, string key)
        {
            var copy = new JsonObject();
            foreach (var name in args.Keys) copy[name] = args[name];

            var value = args[key];
            if (value == null || value.Type == JsonType.Null)
                throw new ToolArgumentException("Missing colour argument '" + key + "'.");
            copy["color"] = value;
            return copy;
        }

        /// <summary>Apply an action to every resolved shape and report how many were changed.</summary>
        public static JsonObject Apply(JsonObject args, Action<corel.Shape> action)
        {
            var shapes = Resolve(args);
            foreach (var shape in shapes) action(shape);
            return new JsonObject { ["shapesChanged"] = shapes.Count };
        }
    }
}
