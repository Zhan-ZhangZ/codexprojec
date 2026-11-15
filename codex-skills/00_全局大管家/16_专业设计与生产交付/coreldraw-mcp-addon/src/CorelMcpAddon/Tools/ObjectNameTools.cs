using System;
using System.Collections.Generic;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>
    /// Naming and inspection of objects, including everything inside groups: the object
    /// manager of the add-on reads only the top level of a layer, and CorelDRAW itself has
    /// no way to address a group member from the MCP surface without these two tools.
    ///
    /// Addressing is done by "path" — the same string list_objects reports, e.g.
    /// "Layer / Group / Object". An element "[3]" addresses the third object of a container,
    /// which is how objects without a name are reached.
    /// </summary>
    public static class ObjectNameTools
    {
        /// <summary>Depth limit, so a pathological document cannot produce an unbounded answer.</summary>
        private const int MaxDepth = 6;

        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "list_objects",
                "List the objects of a layer as a tree, including the contents of groups. " +
                "'layer' defaults to the active layer; 'group' lists one group instead of the " +
                "whole layer. Every entry carries the 'path' accepted by set_object_name and by " +
                "the 'group' argument of the other tools.",
                Schema.Object(new JsonObject
                {
                    ["layer"] = Schema.Str("Layer to list. Default: the active layer."),
                    ["group"] = Schema.Str("Path of a group to list instead of the whole layer.")
                }),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var layer = ShapeTarget.ResolveLayer(args);
                    var group = ToolArgs.String(args, "group", null);

                    corel.Shapes root = layer.Shapes;
                    var prefix = layer.Name;
                    if (!string.IsNullOrEmpty(group))
                    {
                        root = ShapeTarget.FindByPath(layer, group).Shapes;
                        prefix = layer.Name + " / " + group;
                    }

                    var array = Children(root, prefix, 1);
                    return new JsonObject
                    {
                        ["layer"] = layer.Name,
                        ["group"] = group,
                        ["count"] = array.Count,
                        ["objects"] = array
                    };
                }));

            registry.Define(
                "set_object_name",
                "Give a name to an object or a group. Address it by 'path' as reported by " +
                "list_objects: \"Layer / Group / Object\". When the first element is not a layer " +
                "name the path is taken relative to the active layer (or to 'layer').",
                Schema.Required(
                    ("path", Schema.Str("Object path, e.g. \"Layer / Group / Object\".")),
                    ("name", Schema.Str("New name to give the object.")))
                    .WithOptional(("layer", Schema.Str("Layer the path starts from. Default: the active layer."))),
                args =>
                {
                    var path = ToolArgs.String(args, "path");
                    var name = ToolArgs.String(args, "name");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var parts = ShapeTarget.SplitPath(path);
                        if (parts.Count == 0) throw new ToolArgumentException("'path' is empty.");

                        corel.Layer layer = null;
                        var rest = new List<string>(parts);
                        try
                        {
                            layer = LayerTools.FindLayer(parts[0]);
                            rest.RemoveAt(0);
                        }
                        catch (ToolArgumentException)
                        {
                            layer = ShapeTarget.ResolveLayer(args); // relative to a layer the caller named
                        }

                        if (rest.Count == 0)
                            throw new ToolArgumentException(
                                "'path' must name an object or a group, not just a layer.");

                        var shape = ShapeTarget.FindByPath(layer, string.Join(" / ", rest.ToArray()));
                        var previous = CorelJson.Safe(() => shape.Name);
                        shape.Name = name;

                        return new JsonObject
                        {
                            ["path"] = layer.Name + " / " + string.Join(" / ", rest.ToArray()),
                            ["previousName"] = previous,
                            ["name"] = CorelJson.Safe(() => shape.Name)
                        };
                    });
                });
        }

        /// <summary>
        /// One level of the object tree. Groups are descended into until <see cref="MaxDepth"/>,
        /// where the listing is marked as truncated instead of stopping silently.
        /// </summary>
        private static JsonArray Children(corel.Shapes shapes, string prefix, int depth)
        {
            var array = new JsonArray();
            if (shapes == null) return array;

            int count = shapes.Count;
            for (var i = 1; i <= count; i++)
            {
                corel.Shape shape = null;
                try { shape = shapes[i]; } catch { }
                if (shape == null) continue;

                var name = CorelJson.Safe(() => shape.Name);
                var path = prefix + " / " + (string.IsNullOrEmpty(name) ? "[" + i + "]" : name);

                var entry = CorelJson.ShapeToJson(shape, i);
                entry["path"] = path;

                if (shape.Type == corel.cdrShapeType.cdrGroupShape)
                {
                    if (depth < MaxDepth) entry["children"] = Children(shape.Shapes, path, depth + 1);
                    else entry["truncated"] = true;
                }

                array.Add(entry);
            }
            return array;
        }
    }
}
