using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Dimension lines and connectors.</summary>
    public static class DimensionTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "create_dimension",
                "Create a dimension line on the active layer. 'type' is 'horizontal', 'vertical', " +
                "'slanted' (parallel dimension) or 'angular'. 'points' holds two points for " +
                "the linear types and three (centre, first, second) for 'angular'.",
                Schema.Required(
                    ("points", Schema.PointArray("Two points [x, y] for linear types; three for 'angular'.")))
                    .WithOptional(
                        ("type", Schema.Str("horizontal (default), vertical, slanted or angular.")),
                        ("textX", Schema.Number("Dimension line / text X. Defaults to the midpoint of the measured segment.")),
                        ("textY", Schema.Number("Dimension line / text Y. Defaults to the midpoint of the measured segment.")),
                        ("precision", Schema.Integer("Number of decimals. Default 2.")),
                        ("placement", Schema.Str("above (default), within or below the line.")),
                        ("prefix", Schema.Str("Text before the measurement.")),
                        ("suffix", Schema.Str("Text after the measurement.")),
                        ("textSize", Schema.Number("Dimension text size in points. Default 10."))),
                args =>
                {
                    var type = ToolArgs.String(args, "type", "horizontal").Trim().ToLowerInvariant();
                    var angular = type == "angular";
                    if (!angular && type != "horizontal" && type != "vertical" && type != "slanted")
                        throw new ToolArgumentException(
                            "'type' must be horizontal, vertical, slanted or angular.");

                    var points = ToolPoints.Required(args, "points", angular ? 3 : 2);
                    var precision = ToolArgs.Int(args, "precision", 2);
                    if (precision < 0 || precision > 9)
                        throw new ToolArgumentException("'precision' must be between 0 and 9.");
                    var prefix = ToolArgs.String(args, "prefix", "");
                    var suffix = ToolArgs.String(args, "suffix", "");
                    var textSize = ToolArgs.Number(args, "textSize", 10);

                    var placement = ToolArgs.String(args, "placement", "above").Trim().ToLowerInvariant();
                    corel.cdrDimensionPlacement placementValue;
                    if (placement == "above") placementValue = corel.cdrDimensionPlacement.cdrDimensionAboveLine;
                    else if (placement == "within") placementValue = corel.cdrDimensionPlacement.cdrDimensionWithinLine;
                    else if (placement == "below") placementValue = corel.cdrDimensionPlacement.cdrDimensionBelowLine;
                    else throw new ToolArgumentException("'placement' must be above, within or below.");

                    var textX = args.ContainsKey("textX") ? ToolArgs.Number(args, "textX") : (double?)null;
                    var textY = args.ContainsKey("textY") ? ToolArgs.Number(args, "textY") : (double?)null;

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        // The label unit is a separate enum from cdrUnit. CorelDRAW 27 ignores it
                        // for the text it generates — a dimension on a two-inch line still reads
                        // "50,80 мм", and setting Dimension.Linear.Units afterwards is normalised
                        // straight back to millimetres — so this asks for the document's unit and
                        // the drawing skill warns that the label may still come out in mm.
                        var dimensionUnits = Units.DimensionUnits(DocumentTools.RequireActiveDocument().Unit);
                        var app = CorelBridge.Application;
                        var black = app.CreateRGBColor(0, 0, 0);

                        corel.Shape shape;
                        if (angular)
                        {
                            // The text point sets the radius of the dimension arc; without one the
                            // arc would be drawn at the page origin, so fall back to the centroid.
                            var arcX = textX ?? (points[0].X + points[1].X + points[2].X) / 3.0;
                            var arcY = textY ?? (points[0].Y + points[1].Y + points[2].Y) / 3.0;
                            shape = layer.CreateAngularDimension(
                                FreePoint(points[0]), FreePoint(points[1]), FreePoint(points[2]),
                                arcX, arcY,
                                precision, true, corel.cdrDimensionAngularUnits.cdrDimensionUnitDegrees,
                                false, false, prefix, suffix,
                                0.2, null, black, "", (float)textSize, black);
                        }
                        else
                        {
                            corel.cdrLinearDimensionType linearType;
                            if (type == "vertical") linearType = corel.cdrLinearDimensionType.cdrDimensionVertical;
                            else if (type == "slanted") linearType = corel.cdrLinearDimensionType.cdrDimensionSlanted;
                            else linearType = corel.cdrLinearDimensionType.cdrDimensionHorizontal;

                            // The text point also positions the dimension line, so it must be a
                            // real point: passing (0, 0) drags the line to the page origin.
                            // Default to the midpoint of the measured segment.
                            shape = layer.CreateLinearDimension(
                                linearType, FreePoint(points[0]), FreePoint(points[1]),
                                true,
                                textX ?? (points[0].X + points[1].X) / 2.0,
                                textY ?? (points[0].Y + points[1].Y) / 2.0,
                                corel.cdrDimensionStyle.cdrDimensionStyleDecimal, precision, true,
                                dimensionUnits, placementValue,
                                true, false, false, prefix, suffix,
                                0.2, null, black, "", (float)textSize, black);
                        }

                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "create_connector",
                "Create a connector between two points on the active layer. 'type' is 'straight' " +
                "(default), 'rightAngle', 'bspline' or 'bezier'.",
                Schema.Required(
                    ("from", Schema.Point("Start point, [x, y] or { x, y }.")),
                    ("to", Schema.Point("End point, [x, y] or { x, y }.")))
                    .WithOptional(
                        ("type", Schema.Str("straight (default), rightAngle, bspline or bezier.")),
                        ("cornerRadius", Schema.Number("Corner radius for 'rightAngle'. Default 0."))),
                args =>
                {
                    var start = ToolPoints.Single(args["from"], "from");
                    var end = ToolPoints.Single(args["to"], "to");
                    var cornerRadius = ToolArgs.Number(args, "cornerRadius", 0);
                    var type = ToolArgs.String(args, "type", "straight").Trim().ToLowerInvariant();

                    corel.cdrConnectorType connectorType;
                    switch (type)
                    {
                        case "straight": connectorType = corel.cdrConnectorType.cdrConnectorStraight; break;
                        case "rightangle": connectorType = corel.cdrConnectorType.cdrConnectorRightAngle; break;
                        case "bspline": connectorType = corel.cdrConnectorType.cdrConnectorBSpline; break;
                        case "bezier": connectorType = corel.cdrConnectorType.cdrConnectorBezier; break;
                        default:
                            throw new ToolArgumentException(
                                "'type' must be straight, rightAngle, bspline or bezier.");
                    }

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var startPoint = FreePoint(start);
                        var endPoint = FreePoint(end);
                        var shape = type == "rightangle"
                            ? layer.CreateRightAngleConnector(startPoint, endPoint, cornerRadius)
                            : layer.CreateConnectorEx(connectorType, startPoint, endPoint);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });
        }

        private static corel.SnapPoint FreePoint(ToolPoint point)
        {
            return CorelBridge.Application.CreateSnapPoint(point.X, point.Y);
        }
    }
}
