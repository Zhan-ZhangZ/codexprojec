using System;
using System.Collections.Generic;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Object composition: symbols, PowerClip, clones and attribute copying.</summary>
    public static class ObjectExtraTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "convert_to_symbol",
                "Convert the shapes that match the selector into a symbol (the Symbol Manager).",
                Schema.WithTarget(("name", Schema.Str("Name of the symbol in the document library."))),
                args =>
                {
                    var name = ToolArgs.String(args, "name");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = ShapeTarget.Resolve(args);
                        var names = new JsonArray();
                        foreach (var shape in shapes)
                        {
                            var instance = shape.ConvertToSymbol(name);
                            var symbolName = CorelJson.Safe(() => instance.Symbol.Definition.Name);
                            names.Add(string.IsNullOrEmpty(symbolName) ? name : symbolName);
                        }
                        return new JsonObject { ["converted"] = names.Count, ["symbols"] = names };
                    });
                });

            registry.Define(
                "revert_symbol_to_shapes",
                "Revert the symbol instances that match the selector back to plain shapes.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = ShapeTarget.Resolve(args);
                    var reverted = 0;
                    foreach (var shape in shapes)
                    {
                        if (CorelJson.Safe(() => shape.Symbol) == null) continue;
                        shape.Symbol.RevertToShapes();
                        reverted++;
                    }
                    if (reverted == 0)
                        throw new ToolArgumentException("None of the matched shapes is a symbol instance.");
                    return new JsonObject { ["reverted"] = reverted };
                }));

            registry.Define(
                "place_in_powerclip",
                "Place the shapes that match the selector inside a PowerClip container.",
                Schema.WithTarget(
                    ("containerIndex", Schema.Integer("1-based index of the container shape on the active layer.")),
                    ("containerName", Schema.Str("Name of the container shape.")),
                    ("center", Schema.Bool("Centre the contents in the container. Default true.")),
                    ("lock", Schema.Bool("Lock the contents so they cannot be moved by accident. Default false."))),
                args =>
                {
                    var containerIndex = ToolArgs.Int(args, "containerIndex", 0);
                    var containerName = ToolArgs.String(args, "containerName", null);
                    if (containerIndex == 0 && string.IsNullOrEmpty(containerName))
                        throw new ToolArgumentException("Give 'containerIndex' or 'containerName'.");
                    var center = ToolArgs.Bool(args, "center", true);
                    var locked = ToolArgs.Bool(args, "lock", false);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var container = FindContainer(containerIndex, containerName);
                        var shapes = ShapeTarget.Resolve(args);
                        foreach (var shape in shapes)
                            shape.AddToPowerClip(container, center ? corel.cdrTriState.cdrTrue : corel.cdrTriState.cdrFalse);
                        if (locked) container.PowerClip.ContentsLocked = true;
                        return new JsonObject
                        {
                            ["placed"] = shapes.Count,
                            ["container"] = CorelJson.Safe(() => container.Name)
                        };
                    });
                });

            registry.Define(
                "extract_powerclip",
                "Extract the contents of the PowerClip containers that match the selector.",
                Schema.WithTarget(),
                args =>
                {
                    var shapes = ShapeTarget.Resolve(args);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var extracted = 0;
                        foreach (var shape in shapes)
                        {
                            var powerClip = CorelJson.Safe(() => shape.PowerClip);
                            if (powerClip == null || CorelJson.SafeInt(() => powerClip.Shapes.Count) == 0) continue;
                            powerClip.ExtractShapes();
                            extracted++;
                        }
                        if (extracted == 0)
                            throw new ToolArgumentException("None of the matched shapes is a PowerClip container.");
                        return new JsonObject { ["extracted"] = extracted };
                    });
                });

            registry.Define(
                "clone_shape",
                "Create a linked clone of each shape that matches the selector. Changes to the " +
                "master are propagated to its clones.",
                Schema.WithTarget(
                    ("offsetX", Schema.Number("Offset of the clone along X. Default 0.")),
                    ("offsetY", Schema.Number("Offset of the clone along Y. Default 0."))),
                args =>
                {
                    var offsetX = ToolArgs.Number(args, "offsetX", 0);
                    var offsetY = ToolArgs.Number(args, "offsetY", 0);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = ShapeTarget.Resolve(args);
                        var clones = new JsonArray();
                        foreach (var shape in shapes)
                        {
                            var clone = shape.Clone(offsetX, offsetY);
                            clones.Add(CorelJson.ShapeToJson(clone, -1));
                        }
                        return new JsonObject { ["cloned"] = clones.Count, ["clones"] = clones };
                    });
                });

            registry.Define(
                "copy_properties",
                "Attributes eyedropper: copy fill, outline and/or text attributes from a source " +
                "shape onto the shapes that match the selector.",
                Schema.WithTarget(
                    ("sourceIndex", Schema.Integer("1-based index of the source shape on the active layer.")),
                    ("sourceName", Schema.Str("Name of the source shape.")),
                    ("fill", Schema.Bool("Copy the fill. Default true.")),
                    ("outlineColor", Schema.Bool("Copy the outline colour. Default true.")),
                    ("outlinePen", Schema.Bool("Copy the outline pen (width, style). Default true.")),
                    ("textAttrs", Schema.Bool("Copy the text attributes. Default false."))),
                args =>
                {
                    var sourceIndex = ToolArgs.Int(args, "sourceIndex", 0);
                    var sourceName = ToolArgs.String(args, "sourceName", null);
                    if (sourceIndex == 0 && string.IsNullOrEmpty(sourceName))
                        throw new ToolArgumentException("Give 'sourceIndex' or 'sourceName'.");

                    int flags = 0;
                    if (ToolArgs.Bool(args, "fill", true)) flags |= (int)corel.cdrCopyProperties.cdrCopyFill;
                    if (ToolArgs.Bool(args, "outlineColor", true)) flags |= (int)corel.cdrCopyProperties.cdrCopyOutlineColor;
                    if (ToolArgs.Bool(args, "outlinePen", true)) flags |= (int)corel.cdrCopyProperties.cdrCopyOutlinePen;
                    if (ToolArgs.Bool(args, "textAttrs", false)) flags |= (int)corel.cdrCopyProperties.cdrCopyTextAttrs;
                    if (flags == 0) throw new ToolArgumentException("Nothing selected to copy.");

                    var properties = (corel.cdrCopyProperties)flags;
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var source = FindContainer(sourceIndex, sourceName);
                        var shapes = ShapeTarget.Resolve(args);
                        var copied = 0;
                        foreach (var shape in shapes)
                        {
                            if (shape.CopyPropertiesFrom(source, properties)) copied++;
                        }
                        return new JsonObject { ["copied"] = copied, ["from"] = CorelJson.Safe(() => source.Name) };
                    });
                });

            registry.Define(
                "set_locked",
                "Lock or unlock the objects that match the selector (lock icon in the Objects " +
                "docker). A locked object cannot be selected or edited, so unlock by passing " +
                "'index', 'name' or 'all' — a locked object can no longer be picked up by the " +
                "current selection.",
                Schema.WithTarget(("locked", Schema.Bool("true locks the objects, false unlocks them."))),
                args =>
                {
                    if (!args.ContainsKey("locked"))
                        throw new ToolArgumentException("Missing required argument 'locked'.");
                    var locked = ToolArgs.Bool(args, "locked", true);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = ShapeTarget.Resolve(args);
                        foreach (var shape in shapes) shape.Locked = locked;
                        return new JsonObject { ["locked"] = locked, ["shapesChanged"] = shapes.Count };
                    });
                });
        }

        private static corel.Shape FindContainer(int index, string name)
        {
            var layer = ShapeTools.RequireActiveLayer();
            var shape = CorelJson.FindShape(layer, index, name);
            if (shape == null)
                throw new ToolArgumentException("The source/container shape was not found on the active layer.");
            return shape;
        }
    }
}
