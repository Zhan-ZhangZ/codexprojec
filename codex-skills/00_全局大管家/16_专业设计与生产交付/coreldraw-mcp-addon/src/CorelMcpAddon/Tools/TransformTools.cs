using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Geometry transforms, stacking order, grouping and alignment.</summary>
    public static class TransformTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "set_shape_size",
                "Resize shapes to an absolute width and height, in the document unit.",
                Schema.WithTarget(
                    ("width", Schema.Number("New width, in document units.")),
                    ("height", Schema.Number("New height, in document units."))),
                args =>
                {
                    var w = ToolArgs.Number(args, "width");
                    var h = ToolArgs.Number(args, "height");
                    if (w <= 0 || h <= 0) throw new ToolArgumentException("'width' and 'height' must be positive.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.SetSize(w, h)));
                });

            registry.Define(
                "scale_shape",
                "Scale shapes by a factor around their own centre.",
                Schema.WithTarget(
                    ("factor", Schema.Number("Uniform scale factor, e.g. 1.5.")),
                    ("factorY", Schema.Number("Optional separate vertical factor."))),
                args =>
                {
                    var fx = ToolArgs.Number(args, "factor");
                    if (fx <= 0) throw new ToolArgumentException("'factor' must be positive.");
                    var fy = ToolArgs.Number(args, "factorY", fx);
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.SetSize(shape.SizeWidth * fx, shape.SizeHeight * fy)));
                });

            registry.Define(
                "move_shape",
                "Move shapes by a relative offset, in the document unit.",
                Schema.WithTarget(
                    ("dx", Schema.Number("Offset along X, in document units.")),
                    ("dy", Schema.Number("Offset along Y, in document units."))),
                args =>
                {
                    var dx = ToolArgs.Number(args, "dx");
                    var dy = ToolArgs.Number(args, "dy");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            // PositionX/PositionY are measured from the document reference point,
                            // and SetPosition writes in that same frame only by assumption. Read and
                            // write the very same properties instead, so the offset is applied in one
                            // frame regardless of the reference point setting.
                            shape.PositionX = shape.PositionX + dx;
                            shape.PositionY = shape.PositionY + dy;
                        }));
                });

            registry.Define(
                "rotate_shape",
                "Rotate shapes by an angle in degrees (counter-clockwise). " +
                "Optionally around an explicit point, otherwise around each shape's centre.",
                Schema.WithTarget(
                    ("angle", Schema.Number("Rotation angle in degrees.")),
                    ("centerX", Schema.Number("Optional rotation centre X.")),
                    ("centerY", Schema.Number("Optional rotation centre Y."))),
                args =>
                {
                    var angle = ToolArgs.Number(args, "angle");
                    var hasCenter = args.ContainsKey("centerX") && args.ContainsKey("centerY");
                    var cx = ToolArgs.Number(args, "centerX", 0);
                    var cy = ToolArgs.Number(args, "centerY", 0);
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            if (hasCenter) shape.RotateEx(angle, cx, cy);
                            else shape.Rotate(angle);
                        }));
                });

            registry.Define(
                "duplicate_shape",
                "Duplicate shapes one or more times, each copy offset from the previous one.",
                Schema.WithTarget(
                    ("count", Schema.Integer("Number of copies. Default 1.")),
                    ("offsetX", Schema.Number("Offset per copy along X. Default 0.")),
                    ("offsetY", Schema.Number("Offset per copy along Y. Default 0."))),
                args =>
                {
                    var count = ToolArgs.Int(args, "count", 1);
                    if (count < 1 || count > 500) throw new ToolArgumentException("'count' must be between 1 and 500.");
                    var ox = ToolArgs.Number(args, "offsetX", 0);
                    var oy = ToolArgs.Number(args, "offsetY", 0);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = ShapeTarget.Resolve(args);
                        var created = 0;
                        foreach (var shape in shapes)
                        {
                            var current = shape;
                            for (var i = 0; i < count; i++)
                            {
                                current = current.Duplicate(ox, oy);
                                created++;
                            }
                        }
                        return new JsonObject { ["duplicated"] = created, ["from"] = shapes.Count };
                    });
                });

            registry.Define(
                "order_shape",
                "Move shapes in the stacking order: front, back, forward or backward.",
                Schema.WithTarget(("position", Schema.Str("front, back, forward or backward. Default front."))),
                args =>
                {
                    var position = ToolArgs.String(args, "position", "front").ToLowerInvariant();
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            switch (position)
                            {
                                case "front": shape.OrderToFront(); break;
                                case "back": shape.OrderToBack(); break;
                                case "forward": shape.OrderForwardOne(); break;
                                case "backward": shape.OrderBackOne(); break;
                                default: throw new ToolArgumentException("Unknown position '" + position + "'.");
                            }
                        }));
                });

            registry.Define(
                "group_shapes",
                "Group the shapes that match the selector into a single group.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = ShapeTarget.ResolveForSelection(args);
                    if (shapes.Count < 2) throw new ToolArgumentException("Grouping needs at least two shapes.");
                    var group = ShapeTarget.ToRange(shapes).Group();
                    return new JsonObject { ["grouped"] = shapes.Count, ["name"] = CorelJson.Safe(() => group.Name) };
                }));

            registry.Define(
                "ungroup_shapes",
                "Break the selected groups apart into their child shapes, one level per call.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = ShapeTarget.ResolveForSelection(args);
                    var groups = 0;
                    foreach (var shape in shapes)
                    {
                        if (shape.Type != corel.cdrShapeType.cdrGroupShape) continue;
                        ShapeTarget.ToRange(new System.Collections.Generic.List<corel.Shape> { shape }).UngroupAll();
                        groups++;
                    }
                    if (groups == 0) throw new ToolArgumentException("None of the matched shapes is a group.");
                    return new JsonObject { ["ungrouped"] = groups };
                }));

            registry.Define(
                "align_shapes",
                "Align the shapes that match the selector against the page or the page centre.",
                Schema.WithTarget(
                    ("align", Schema.Str("left, right, hcenter, top, bottom or vcenter.")),
                    ("to", Schema.Str("'page' (default) or 'pagecenter'."))),
                args =>
                {
                    var align = ToolArgs.String(args, "align", "left").ToLowerInvariant();
                    var to = ToolArgs.String(args, "to", "page").ToLowerInvariant();

                    corel.cdrAlignType type;
                    switch (align)
                    {
                        case "left": type = corel.cdrAlignType.cdrAlignLeft; break;
                        case "right": type = corel.cdrAlignType.cdrAlignRight; break;
                        case "hcenter": type = corel.cdrAlignType.cdrAlignHCenter; break;
                        case "top": type = corel.cdrAlignType.cdrAlignTop; break;
                        case "bottom": type = corel.cdrAlignType.cdrAlignBottom; break;
                        case "vcenter": type = corel.cdrAlignType.cdrAlignVCenter; break;
                        default: throw new ToolArgumentException("Unknown align '" + align + "'.");
                    }

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = ShapeTarget.ResolveForSelection(args);
                        var range = ShapeTarget.ToRange(shapes);
                        if (to == "pagecenter") range.AlignToPageCenter(type, corel.cdrTextAlignOrigin.cdrTextAlignBoundingBox);
                        else range.AlignToPage(type, corel.cdrTextAlignOrigin.cdrTextAlignBoundingBox);
                        return new JsonObject { ["aligned"] = shapes.Count, ["align"] = align, ["to"] = to };
                    });
                });
        }
    }
}
