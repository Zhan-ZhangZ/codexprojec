using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Selection tools.</summary>
    public static class SelectTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "select_shapes",
                "Select shapes in CorelDRAW so that other tools (and the user) act on them. " +
                "Give 'indices' to select several specific shapes at once, or index / name / type, " +
                "or all=true for the whole active layer.",
                Schema.Target().WithOptional(
                    ("indices", Schema.NumberArray("Array of 1-based shape indices to select together, e.g. [1,3,5]."))),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = ResolveSelection(args);
                    var range = CorelBridge.Application.CreateShapeRange();
                    foreach (var shape in shapes) range.Add(shape);
                    range.CreateSelection();
                    return new JsonObject { ["selected"] = shapes.Count };
                }));

            registry.Define(
                "clear_selection",
                "Deselect everything in the document. Tools that take no shape selector then have nothing to act on until something is selected again.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    DocumentTools.RequireActiveDocument().ClearSelection();
                    return new JsonObject { ["selected"] = 0 };
                }));

            registry.Define(
                "get_selection",
                "List the shapes currently selected in CorelDRAW.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var range = DocumentTools.RequireActiveDocument().SelectionRange;
                    var array = new JsonArray();
                    if (range != null && range.Count > 0)
                    {
                        for (var i = 1; i <= range.Count; i++)
                        {
                            corel.Shape shape = null;
                            try { shape = range[i]; } catch { }
                            if (shape != null) array.Add(CorelJson.ShapeToJson(shape, i));
                        }
                    }
                    return new JsonObject { ["count"] = array.Count, ["shapes"] = array };
                }));
        }

        /// <summary>
        /// The standard selector, plus an "indices" array for selecting several specific
        /// shapes at once (a plain selector replaces the selection with a single shape).
        /// </summary>
        private static System.Collections.Generic.List<corel.Shape> ResolveSelection(JsonObject args)
        {
            var indices = args["indices"] as JsonArray;
            if (indices == null) return ShapeTarget.ResolveForSelection(args);

            var layer = ShapeTarget.ResolveLayer(args);
            var shapes = new System.Collections.Generic.List<corel.Shape>();
            foreach (var item in indices)
            {
                var index = (int)Math.Round(ToolPoints.Number(item));
                if (index < 1 || index > layer.Shapes.Count)
                    throw new ToolArgumentException(
                        "No shape at index " + index + " on layer '" + layer.Name + "'.");
                shapes.Add(layer.Shapes[index]);
            }
            if (shapes.Count == 0)
                throw new ToolArgumentException("'indices' must contain at least one index.");
            return shapes;
        }
    }

    /// <summary>Boolean / shaping operations on the current selection.</summary>
    public static class BooleanTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "combine_shapes",
                "Combine the selected shapes into a single curve.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = Selection();
                    ShapeTarget.ToRange(shapes).Combine();
                    return new JsonObject { ["combined"] = shapes.Count };
                }));

            registry.Define(
                "break_apart_shapes",
                "Break the selected shapes apart into their sub-paths.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = Selection();
                    ShapeTarget.ToRange(shapes).BreakApart();
                    return new JsonObject { ["brokenApart"] = shapes.Count };
                }));

            registry.Define(
                "weld_shapes",
                "Weld the selected shapes together (the first shape receives the rest).",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                    WeldLike("weld", (source, target) => source.Weld(target, false, false))));

            registry.Define(
                "trim_shapes",
                "Trim the selected shapes (the first shape trims the rest).",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                    WeldLike("trim", (source, target) => source.Trim(target, false, false))));

            registry.Define(
                "intersect_shapes",
                "Keep only the intersection of the selected shapes.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                    WeldLike("intersect", (source, target) => source.Intersect(target, false, false))));

            registry.Define(
                "fillet_shape",
                "Round the corners (nodes) of the selected curves.",
                Schema.WithTarget(("radius", Schema.Number("Corner radius in document units."))),
                args =>
                {
                    var radius = ToolArgs.Number(args, "radius");
                    if (radius <= 0) throw new ToolArgumentException("'radius' must be positive.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.Fillet(radius, true)));
                });

            registry.Define(
                "chamfer_shape",
                "Chamfer (cut) the corners of the selected curves.",
                Schema.WithTarget(
                    ("distanceA", Schema.Number("Chamfer distance along the first edge, in document units.")),
                    ("distanceB", Schema.Number("Chamfer distance B. Defaults to A."))),
                args =>
                {
                    var a = ToolArgs.Number(args, "distanceA");
                    var b = ToolArgs.Number(args, "distanceB", a);
                    if (a <= 0 || b <= 0) throw new ToolArgumentException("Chamfer distances must be positive.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.Chamfer(a, b, true)));
                });

            registry.Define(
                "scallop_shape",
                "Scallop the corners of the selected curves.",
                Schema.WithTarget(("radius", Schema.Number("Scallop radius in document units."))),
                args =>
                {
                    var radius = ToolArgs.Number(args, "radius");
                    if (radius <= 0) throw new ToolArgumentException("'radius' must be positive.");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = ShapeTarget.ResolveForSelection(args);
                        ShapeTarget.ToRange(shapes).Scallop(radius, true);
                        return new JsonObject { ["scalloped"] = shapes.Count };
                    });
                });
        }

        private static System.Collections.Generic.List<corel.Shape> Selection()
        {
            var doc = DocumentTools.RequireActiveDocument();
            var range = doc.SelectionRange;
            if (range == null || range.Count < 2)
                throw new ToolArgumentException("Select at least two shapes first.");

            var shapes = new System.Collections.Generic.List<corel.Shape>();
            for (var i = 1; i <= range.Count; i++)
            {
                corel.Shape shape = null;
                try { shape = range[i]; } catch { }
                if (shape != null) shapes.Add(shape);
            }
            return shapes;
        }

        private static JsonValue WeldLike(string name, System.Func<corel.Shape, corel.Shape, corel.Shape> operation)
        {
            var shapes = Selection();
            var source = shapes[0];
            for (var i = 1; i < shapes.Count; i++) source = operation(source, shapes[i]);
            return new JsonObject { ["operation"] = name, ["shapes"] = shapes.Count };
        }
    }
}
