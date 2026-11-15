using System;
using System.Collections.Generic;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Drawing tools that are not the plain primitives: spiral, graph paper and polyline/Bezier curves.</summary>
    public static class DrawingExtraTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "create_spiral",
                "Create a spiral on the active layer. Coordinates are in the document unit.",
                Schema.Required(
                    ("left", Schema.Number("Left edge X coordinate, in document units.")),
                    ("top", Schema.Number("Top edge Y coordinate, in document units.")),
                    ("right", Schema.Number("Right edge X coordinate, in document units.")),
                    ("bottom", Schema.Number("Bottom edge Y coordinate, in document units.")))
                    .WithOptional(
                        ("revolutions", Schema.Integer("Number of revolutions. Default 4.")),
                        ("spiralType", Schema.Str("'symmetric' (default) or 'logarithmic'.")),
                        ("growthRate", Schema.Integer("Growth rate for a logarithmic spiral. Default 30."))),
                args =>
                {
                    var left = ToolArgs.Number(args, "left");
                    var top = ToolArgs.Number(args, "top");
                    var right = ToolArgs.Number(args, "right");
                    var bottom = ToolArgs.Number(args, "bottom");
                    var revolutions = ToolArgs.Int(args, "revolutions", 4);
                    if (revolutions < 1) throw new ToolArgumentException("'revolutions' must be at least 1.");
                    var growthRate = ToolArgs.Int(args, "growthRate", 30);

                    var type = ToolArgs.String(args, "spiralType", "symmetric").Trim().ToLowerInvariant();
                    corel.cdrSpiralType spiralType;
                    if (type == "symmetric") spiralType = corel.cdrSpiralType.cdrSymmetric;
                    else if (type == "logarithmic") spiralType = corel.cdrSpiralType.cdrLogarithmic;
                    else throw new ToolArgumentException("'spiralType' must be 'symmetric' or 'logarithmic'.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var shape = layer.CreateSpiral(left, top, right, bottom, revolutions, spiralType, growthRate);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "create_graph_paper",
                "Create graph paper (a grid of rectangles) on the active layer.",
                Schema.Required(
                    ("left", Schema.Number("Left edge X coordinate, in document units.")),
                    ("top", Schema.Number("Top edge Y coordinate, in document units.")),
                    ("right", Schema.Number("Right edge X coordinate, in document units.")),
                    ("bottom", Schema.Number("Bottom edge Y coordinate, in document units.")))
                    .WithOptional(
                        ("columns", Schema.Integer("Number of columns. Default 4.")),
                        ("rows", Schema.Integer("Number of rows. Default 4."))),
                args =>
                {
                    var left = ToolArgs.Number(args, "left");
                    var top = ToolArgs.Number(args, "top");
                    var right = ToolArgs.Number(args, "right");
                    var bottom = ToolArgs.Number(args, "bottom");
                    var columns = ToolArgs.Int(args, "columns", 4);
                    var rows = ToolArgs.Int(args, "rows", 4);
                    if (columns < 1 || rows < 1)
                        throw new ToolArgumentException("'columns' and 'rows' must be at least 1.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var shape = layer.CreateGridBoxes(left, top, right, bottom, columns, rows);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "create_curve",
                "Create a polyline or Bezier curve on the active layer. 'points' is an array of " +
                "points; each point is [x, y] or an object { x, y, c1x, c1y, c2x, c2y }, where " +
                "c1x/c1y is that point's INCOMING control handle and c2x/c2y its OUTGOING one. " +
                "A handle the caller omits is smoothed with a Catmull-Rom tangent through the " +
                "neighbouring points, which reproduces the Freehand / Pen / Bezier tools; with " +
                "'closed' the closing seam is smoothed as well.",
                Schema.Required(
                    ("points", Schema.PointArray("Array of [x, y] pairs or { x, y, c1x, c1y, c2x, c2y } objects.")))
                    .WithOptional(
                        ("mode", Schema.Str("'polyline' (default), 'smooth' or 'bezier'.")),
                        ("closed", Schema.Bool("Close the path. Default false."))),
                args =>
                {
                    var points = ParsePoints(args["points"]);
                    if (points.Count < 2)
                        throw new ToolArgumentException("'points' must contain at least two points.");

                    var mode = ToolArgs.String(args, "mode", "polyline").Trim().ToLowerInvariant();
                    if (mode != "polyline" && mode != "smooth" && mode != "bezier")
                        throw new ToolArgumentException("'mode' must be 'polyline', 'smooth' or 'bezier'.");
                    var closed = ToolArgs.Bool(args, "closed", false);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var app = CorelBridge.Application;
                        var doc = DocumentTools.RequireActiveDocument();
                        var layer = ShapeTools.RequireActiveLayer();

                        var geometry = new List<ToolPoint>(points.Count);
                        foreach (var point in points) geometry.Add(new ToolPoint(point.X, point.Y));

                        var curve = app.CreateCurve(doc);
                        var subPath = curve.CreateSubPath(points[0].X, points[0].Y);

                        for (var i = 1; i < points.Count; i++)
                        {
                            var current = points[i];
                            if (mode == "polyline")
                            {
                                subPath.AppendLineSegment(current.X, current.Y, false);
                                continue;
                            }
                            var start = Handle(points, geometry, i - 1, true, closed);
                            var end = Handle(points, geometry, i, false, closed);
                            // AppendCurveSegment2 takes ABSOLUTE control points. The plain
                            // AppendCurveSegment overload takes a length/angle pair instead and
                            // silently mangles the path, so it must never be used here.
                            subPath.AppendCurveSegment2(
                                current.X, current.Y, start.X, start.Y, end.X, end.Y, false);
                        }

                        if (closed)
                        {
                            // Close with a real curve segment so the seam is smoothed like the rest,
                            // then let CorelDRAW mark the subpath closed.
                            if (mode != "polyline")
                            {
                                var first = points[0];
                                var start = Handle(points, geometry, points.Count - 1, true, closed);
                                var end = Handle(points, geometry, 0, false, closed);
                                subPath.AppendCurveSegment2(
                                    first.X, first.Y, start.X, start.Y, end.X, end.Y, false);
                            }
                            subPath.Closed = true;
                        }

                        var shape = layer.CreateCurve(curve);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });
        }

        /// <summary>
        /// The control point at <paramref name="index"/>: an explicit c2 (outgoing) or c1
        /// (incoming) when the caller gave one, otherwise the smoothed Catmull-Rom handle.
        /// </summary>
        private static ToolPoint Handle(List<PathPoint> points, List<ToolPoint> geometry,
            int index, bool outgoing, bool closed)
        {
            var point = points[index];
            if (outgoing)
            {
                if (point.C2X.HasValue && point.C2Y.HasValue)
                    return new ToolPoint(point.C2X.Value, point.C2Y.Value);
                return CurveGeometry.Outgoing(geometry, index, closed);
            }
            if (point.C1X.HasValue && point.C1Y.HasValue)
                return new ToolPoint(point.C1X.Value, point.C1Y.Value);
            return CurveGeometry.Incoming(geometry, index, closed);
        }

        /// <summary>One point of a create_curve path; the control points are optional.</summary>
        private class PathPoint
        {
            public double X;
            public double Y;
            public double? C1X;
            public double? C1Y;
            public double? C2X;
            public double? C2Y;
        }

        private static List<PathPoint> ParsePoints(JsonValue value)
        {
            var array = value as JsonArray;
            if (array == null)
                throw new ToolArgumentException("'points' must be a JSON array of points.");

            var points = new List<PathPoint>();
            foreach (var element in array)
            {
                var plain = ToolPoints.Single(element, "points");
                var item = element as JsonObject;
                points.Add(new PathPoint
                {
                    X = plain.X,
                    Y = plain.Y,
                    C1X = item == null ? null : OptionalNumber(item["c1x"]),
                    C1Y = item == null ? null : OptionalNumber(item["c1y"]),
                    C2X = item == null ? null : OptionalNumber(item["c2x"]),
                    C2Y = item == null ? null : OptionalNumber(item["c2y"])
                });
            }
            return points;
        }

        private static double? OptionalNumber(JsonValue value)
        {
            if (value == null || value.Type == JsonType.Null) return null;
            return ToolPoints.Number(value);
        }
    }
}
