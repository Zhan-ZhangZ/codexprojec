using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Document layout: the grid and guides.</summary>
    public static class LayoutTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "set_grid",
                "Show, hide and configure the document grid (spacing, dot or line, snapping).",
                Schema.Object(new JsonObject
                {
                    ["visible"] = Schema.Bool("True draws the grid in the document window."),
                    ["spacingX"] = Schema.Number("Horizontal grid spacing, in document units."),
                    ["spacingY"] = Schema.Number("Vertical grid spacing, in document units."),
                    ["gridType"] = Schema.Str("'dot' or 'line' grid style."),
                    ["snap"] = Schema.Bool("Snap objects to the grid.")
                }),
                args =>
                {
                    var gridType = ToolArgs.String(args, "gridType", null);
                    corel.cdrGridType type = corel.cdrGridType.cdrGridDot;
                    if (gridType != null)
                    {
                        if (gridType.Equals("dot", StringComparison.OrdinalIgnoreCase))
                            type = corel.cdrGridType.cdrGridDot;
                        else if (gridType.Equals("line", StringComparison.OrdinalIgnoreCase))
                            type = corel.cdrGridType.cdrGridLine;
                        else throw new ToolArgumentException("'gridType' must be 'dot' or 'line'.");
                    }

                    var spacingX = ToolArgs.Number(args, "spacingX", 0);
                    var spacingY = ToolArgs.Number(args, "spacingY", 0);
                    if (spacingX < 0 || spacingY < 0)
                        throw new ToolArgumentException("Grid spacing must be positive.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var grid = DocumentTools.RequireActiveDocument().Grid;
                        if (args.ContainsKey("visible")) grid.Visible = ToolArgs.Bool(args, "visible", true);
                        if (args.ContainsKey("snap")) grid.Snap = ToolArgs.Bool(args, "snap", true);
                        if (gridType != null) grid.Type = type;
                        if (spacingX > 0) grid.SpacingX = spacingX;
                        if (spacingY > 0) grid.SpacingY = spacingY;

                        return new JsonObject
                        {
                            ["visible"] = CorelJson.SafeInt(() => grid.Visible ? 1 : 0) == 1,
                            ["snap"] = CorelJson.SafeInt(() => grid.Snap ? 1 : 0) == 1,
                            ["spacingX"] = CorelJson.SafeNumber(() => grid.SpacingX),
                            ["spacingY"] = CorelJson.SafeNumber(() => grid.SpacingY),
                            ["gridType"] = CorelJson.Safe(() => grid.Type.ToString())
                        };
                    });
                });

            registry.Define(
                "add_guide",
                "Add guides to the active page. 'type' is 'horizontal' (default), 'vertical' or " +
                "'slanted'. For horizontal/vertical give 'position'; for slanted give 'x', 'y' and " +
                "'angle'. 'positions' adds several parallel guides at once.",
                Schema.Object(new JsonObject
                {
                    ["type"] = Schema.Str("horizontal (default), vertical or slanted."),
                    ["position"] = Schema.Number("Distance from the page origin for horizontal/vertical guides."),
                    ["x"] = Schema.Number("Slanted guide: X of the point the guide passes through."),
                    ["y"] = Schema.Number("Slanted guide: Y of the point the guide passes through."),
                    ["angle"] = Schema.Number("Slanted guide: angle in degrees."),
                    ["positions"] = Schema.NumberArray("Array of positions, to add several guides at once.")
                }),
                args =>
                {
                    var type = ToolArgs.String(args, "type", "horizontal").Trim().ToLowerInvariant();
                    if (type != "horizontal" && type != "vertical" && type != "slanted")
                        throw new ToolArgumentException("'type' must be horizontal, vertical or slanted.");

                    var positions = new System.Collections.Generic.List<double>();
                    var list = args["positions"] as JsonArray;
                    if (list != null)
                    {
                        foreach (var item in list) positions.Add(ToolPoints.Number(item));
                    }
                    else if (args.ContainsKey("position"))
                    {
                        positions.Add(ToolArgs.Number(args, "position"));
                    }

                    if (positions.Count == 0 && type != "slanted")
                        throw new ToolArgumentException("Give 'position' or 'positions'.");
                    var x = ToolArgs.Number(args, "x", 0);
                    var y = ToolArgs.Number(args, "y", 0);
                    var angle = ToolArgs.Number(args, "angle", 0);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var page = RequirePage();
                        var layer = page.GuidesLayer;
                        var added = 0;

                        if (type == "slanted")
                        {
                            layer.CreateGuideAngle(x, y, angle);
                            added++;
                        }
                        else
                        {
                            foreach (var position in positions)
                            {
                                if (type == "horizontal")
                                    layer.CreateGuide(0, position, page.SizeWidth, position);
                                else
                                    layer.CreateGuide(position, 0, position, page.SizeHeight);
                                added++;
                            }
                        }

                        return new JsonObject
                        {
                            ["added"] = added,
                            ["type"] = type,
                            ["guides"] = GuideShapes(corel.cdrGuideType.cdrAllGuides).Count
                        };
                    });
                });

            registry.Define(
                "list_guides",
                "List the guides of the active page: orientation (horizontal or vertical) and position in document units.",
                Schema.Object(new JsonObject
                {
                    ["type"] = Schema.Str("horizontal, vertical, slanted or all (default).")
                }),
                args =>
                {
                    var type = ParseGuideType(ToolArgs.String(args, "type", "all"));
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var array = new JsonArray();
                        foreach (var shape in GuideShapes(type))
                        {
                            var guide = CorelJson.Safe(() => shape.Guide);
                            if (guide == null) continue;

                            array.Add(new JsonObject
                            {
                                ["name"] = CorelJson.Safe(() => shape.Name),
                                ["type"] = CorelJson.Safe(() => guide.Type.ToString()),
                                ["point1X"] = CorelJson.SafeNumber(() => guide.Point1X),
                                ["point1Y"] = CorelJson.SafeNumber(() => guide.Point1Y),
                                ["point2X"] = CorelJson.SafeNumber(() => guide.Point2X),
                                ["point2Y"] = CorelJson.SafeNumber(() => guide.Point2Y),
                                ["angle"] = CorelJson.SafeNumber(() => guide.Angle)
                            });
                        }
                        return new JsonObject { ["count"] = array.Count, ["guides"] = array };
                    });
                });

            registry.Define(
                "delete_guides",
                "Delete guides from the active page вЂ” all of them, or only the horizontal or vertical ones.",
                Schema.Object(new JsonObject
                {
                    ["type"] = Schema.Str("horizontal, vertical, slanted or all (default).")
                }),
                args =>
                {
                    var type = ParseGuideType(ToolArgs.String(args, "type", "all"));
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = GuideShapes(type);
                        foreach (var shape in shapes) shape.Delete();
                        return new JsonObject { ["deleted"] = shapes.Count };
                    });
                });
        }

        private static corel.Page RequirePage()
        {
            var page = DocumentTools.RequireActiveDocument().ActivePage;
            if (page == null) throw new InvalidOperationException("No active page.");
            return page;
        }

        /// <summary>
        /// Snapshot the guide shapes of the document, optionally filtered by guide type.
        ///
        /// A page's Guides collection and its guides layer's Shapes collection both stay empty
        /// even right after CreateGuide returns a valid guideline shape, so the guides are read
        /// from the document's shape list instead.
        /// </summary>
        private static System.Collections.Generic.List<corel.Shape> GuideShapes(corel.cdrGuideType filter)
        {
            var result = new System.Collections.Generic.List<corel.Shape>();
            var document = DocumentTools.RequireActiveDocument();

            foreach (var shape in TextTools.EnumerateDocumentShapes(document))
            {
                if (shape.Type != corel.cdrShapeType.cdrGuidelineShape) continue;

                var guide = CorelJson.Safe(() => shape.Guide);
                if (guide == null) continue;
                if (filter != corel.cdrGuideType.cdrAllGuides && guide.Type != filter) continue;
                result.Add(shape);
            }
            return result;
        }

        private static corel.cdrGuideType ParseGuideType(string value)
        {
            switch ((value ?? "all").Trim().ToLowerInvariant())
            {
                case "horizontal": return corel.cdrGuideType.cdrHorizontalGuide;
                case "vertical": return corel.cdrGuideType.cdrVerticalGuide;
                case "slanted": return corel.cdrGuideType.cdrSlantedGuide;
                case "all": return corel.cdrGuideType.cdrAllGuides;
                default: throw new ToolArgumentException("'type' must be horizontal, vertical, slanted or all.");
            }
        }
    }
}
