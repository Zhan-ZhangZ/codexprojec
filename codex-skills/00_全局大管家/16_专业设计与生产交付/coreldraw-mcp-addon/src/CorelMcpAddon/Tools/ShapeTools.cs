using System;
using CorelMcp.Json;
using CorelMcp.Config;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Shape creation / inspection tools.</summary>
    public static class ShapeTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "create_rectangle",
                "Create a rectangle on the active layer. Coordinates are in the document unit and " +
                "measured from the page's bottom-left corner, with Y growing upwards; the " +
                "'referencePoint' that get_document_info reports only affects the ruler display. " +
                "The new shape carries CorelDRAW's default outline — call set_outline_none for a " +
                "stroke-free fill.",
                Schema.Required(
                    ("left", Schema.Number("Left edge X coordinate, in document units.")),
                    ("top", Schema.Number("Top edge Y coordinate, in document units.")),
                    ("right", Schema.Number("Right edge X coordinate, in document units.")),
                    ("bottom", Schema.Number("Bottom edge Y coordinate, in document units.")))
                    .WithOptional(("cornerRadius", Schema.Integer("Corner roundness 0-100. Default 0."))),
                args =>
                {
                    double left = ToolArgs.Number(args, "left");
                    double top = ToolArgs.Number(args, "top");
                    double right = ToolArgs.Number(args, "right");
                    double bottom = ToolArgs.Number(args, "bottom");
                    int radius = ToolArgs.Int(args, "cornerRadius", 0);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        var shape = layer.CreateRectangle(left, top, right, bottom, radius, radius, radius, radius);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "create_ellipse",
                "Create an ellipse on the active layer. Coordinates are in the document unit, with " +
                "Y growing upwards from the page's bottom-left corner. The new shape carries " +
                "CorelDRAW's default outline — call set_outline_none for a stroke-free fill.",
                Schema.Required(
                    ("left", Schema.Number("Left edge X coordinate, in document units.")),
                    ("top", Schema.Number("Top edge Y coordinate, in document units.")),
                    ("right", Schema.Number("Right edge X coordinate, in document units.")),
                    ("bottom", Schema.Number("Bottom edge Y coordinate, in document units."))),
                args =>
                {
                    double left = ToolArgs.Number(args, "left");
                    double top = ToolArgs.Number(args, "top");
                    double right = ToolArgs.Number(args, "right");
                    double bottom = ToolArgs.Number(args, "bottom");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        var shape = layer.CreateEllipse(left, top, right, bottom, 0, 0, false);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "create_line",
                "Create a straight line segment on the active layer. Coordinates are in the document unit.",
                Schema.Required(
                    ("startX", Schema.Number("Start X coordinate, in document units.")),
                    ("startY", Schema.Number("Start Y coordinate, in document units.")),
                    ("endX", Schema.Number("End X coordinate, in document units.")),
                    ("endY", Schema.Number("End Y coordinate, in document units."))),
                args =>
                {
                    double x1 = ToolArgs.Number(args, "startX");
                    double y1 = ToolArgs.Number(args, "startY");
                    double x2 = ToolArgs.Number(args, "endX");
                    double y2 = ToolArgs.Number(args, "endY");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        var shape = layer.CreateLineSegment(x1, y1, x2, y2);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "import_image",
                "Import a bitmap or vector file into the active layer (auto-detects the format).",
                Schema.Required(("path", Schema.Str("Absolute path to the file to import."))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        layer.Import(path, corel.cdrFilter.cdrAutoSense, null);
                        Log.Info("Imported '" + path + "'.");
                        return new JsonObject { ["imported"] = true, ["path"] = path, ["shapes"] = layer.Shapes.Count };
                    });
                });

            registry.Define(
                "import_svg",
                "Import an SVG file into the active layer.",
                Schema.Required(("path", Schema.Str("Absolute path to the .svg file."))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        layer.Import(path, corel.cdrFilter.cdrSVG, null);
                        Log.Info("Imported SVG '" + path + "'.");
                        return new JsonObject { ["imported"] = true, ["path"] = path, ["shapes"] = layer.Shapes.Count };
                    });
                });

            registry.Define(
                "list_shapes",
                "List the shapes on the active layer in stacking order, 1-based from the top, with name, type and bounding box.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var layer = RequireActiveLayer();
                    return new JsonObject
                    {
                        ["layer"] = layer.Name,
                        ["count"] = layer.Shapes.Count,
                        ["shapes"] = CorelJson.ShapesToJson(layer.Shapes)
                    };
                }));

            registry.Define(
                "get_shape_info",
                "Get one shape's properties, selected by 1-based index or by name.",
                Schema.Object(new JsonObject
                {
                    ["index"] = Schema.Integer("1-based shape index on the active layer."),
                    ["name"] = Schema.Str("Shape name (used when index is omitted).")
                }),
                args =>
                {
                    int index = ToolArgs.Int(args, "index", 0);
                    string name = ToolArgs.String(args, "name", null);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        var shape = CorelJson.FindShape(layer, index, name);
                        if (shape == null) throw new ToolArgumentException("Shape not found.");
                        return CorelJson.ShapeToJson(shape, index > 0 ? index : -1);
                    });
                });

            registry.Define(
                "set_shape_position",
                "Move a shape to absolute coordinates on the active layer.",
                Schema.Object(new JsonObject
                {
                    ["index"] = Schema.Integer("1-based index on the active layer."),
                    ["name"] = Schema.Str("Shape name (used when index is omitted)."),
                    ["x"] = Schema.Number("Target X coordinate, in document units."),
                    ["y"] = Schema.Number("Target Y coordinate, in document units.")
                }, "x", "y"),
                args =>
                {
                    int index = ToolArgs.Int(args, "index", 0);
                    string name = ToolArgs.String(args, "name", null);
                    double x = ToolArgs.Number(args, "x");
                    double y = ToolArgs.Number(args, "y");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        var shape = CorelJson.FindShape(layer, index, name);
                        if (shape == null) throw new ToolArgumentException("Shape not found.");
                        shape.SetPosition(x, y);
                        return CorelJson.ShapeToJson(shape, index > 0 ? index : -1);
                    });
                });

            registry.Define(
                "delete_shape",
                "Delete a shape from the active layer, selected by 1-based index or by name.",
                Schema.Object(new JsonObject
                {
                    ["index"] = Schema.Integer("1-based index on the active layer."),
                    ["name"] = Schema.Str("Shape name (used when index is omitted).")
                }),
                args =>
                {
                    int index = ToolArgs.Int(args, "index", 0);
                    string name = ToolArgs.String(args, "name", null);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        var shape = CorelJson.FindShape(layer, index, name);
                        if (shape == null) throw new ToolArgumentException("Shape not found.");
                        shape.Delete();
                        return new JsonObject { ["deleted"] = true, ["remaining"] = layer.Shapes.Count };
                    });
                });

            registry.Define(
                "create_polygon",
                "Create a regular polygon on the active layer. The first vertex lies on the " +
                "positive X axis, so 'sides': 4 already yields a diamond (its vertices sit on the " +
                "axes) — rotate by 45 for a square. The new shape carries CorelDRAW's default " +
                "outline.",
                Schema.Required(
                    ("cx", Schema.Number("Centre X coordinate, in document units.")),
                    ("cy", Schema.Number("Centre Y coordinate, in document units.")),
                    ("radius", Schema.Number("Circumscribed radius (centre to vertex), in document units.")),
                    ("sides", Schema.Integer("Number of sides, 3 or more."))),
                args =>
                {
                    var cx = ToolArgs.Number(args, "cx");
                    var cy = ToolArgs.Number(args, "cy");
                    var radius = ToolArgs.Number(args, "radius");
                    var sides = ToolArgs.Int(args, "sides", 6);
                    if (sides < 3) throw new ToolArgumentException("'sides' must be at least 3.");
                    if (radius <= 0) throw new ToolArgumentException("'radius' must be positive.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = RequireActiveLayer();
                        // CreatePolygon2(CentreX, CentreY, Radius, Sides, Angle, InnerRadius,
                        //                Star, Sharpness) — unambiguous, unlike CreatePolygon,
                        //                whose Complexity/MaxComplexity arguments CorelDRAW
                        //                rejects for most combinations.
                        var shape = layer.CreatePolygon2(cx, cy, radius, sides, 0, 0, false, 2);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "create_star",
                "Create a star on the active layer. The outline is built from 2 x 'points' " +
                "vertices alternating between 'radius' and 'radius' x 'innerRatio', with the " +
                "first ray pointing straight up — the shape CorelDRAW's Star tool produces. The " +
                "new shape carries CorelDRAW's default outline — call set_outline_none for a " +
                "stroke-free fill.",
                Schema.Required(
                    ("cx", Schema.Number("Centre X coordinate, in document units.")),
                    ("cy", Schema.Number("Centre Y coordinate, in document units.")),
                    ("radius", Schema.Number("Outer radius, in document units.")),
                    ("points", Schema.Integer("Number of points (rays), 3 or more.")))
                    .WithOptional(
                        ("innerRatio", Schema.Number(
                            "Inner radius as a fraction of 'radius'. Default 0.4."))),
                args =>
                {
                    var cx = ToolArgs.Number(args, "cx");
                    var cy = ToolArgs.Number(args, "cy");
                    var radius = ToolArgs.Number(args, "radius");
                    var points = ToolArgs.Int(args, "points", 5);
                    var innerRatio = ToolArgs.Number(args, "innerRatio", 0.4);
                    if (points < 3) throw new ToolArgumentException("'points' must be at least 3.");
                    if (radius <= 0) throw new ToolArgumentException("'radius' must be positive.");
                    if (innerRatio <= 0 || innerRatio >= 1)
                        throw new ToolArgumentException("'innerRatio' must be between 0 and 1 (exclusive).");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var app = CorelBridge.Application;
                        var doc = DocumentTools.RequireActiveDocument();
                        var layer = RequireActiveLayer();

                        // The outline is emitted vertex by vertex rather than through
                        // CreatePolygon2 with Star=true: CorelDRAW rejects small point counts
                        // there outright (4 fails with a nonsensical sharpness range) and its
                        // sharpness cannot be set, so the inner radius would not be controllable.
                        var vertices = CurveGeometry.Star(cx, cy, radius, points, innerRatio);
                        var curve = app.CreateCurve(doc);
                        var subPath = curve.CreateSubPath(vertices[0].X, vertices[0].Y);
                        for (var i = 1; i < vertices.Count; i++)
                            subPath.AppendLineSegment(vertices[i].X, vertices[i].Y, false);
                        subPath.Closed = true;

                        var shape = layer.CreateCurve(curve);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });
        }

        internal static corel.Layer RequireActiveLayer()
        {
            var doc = DocumentTools.RequireActiveDocument();
            var layer = doc.ActiveLayer;
            if (layer == null) throw new InvalidOperationException("The active document has no active layer.");
            return layer;
        }
    }
}
