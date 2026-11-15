using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>View navigation (zoom / pan) and free transform (skew).</summary>
    public static class NavigationTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "set_zoom",
                "Zoom and/or pan the active view of the active document. 'percent' sets the zoom level " +
                "(100 = 100%), 'fit' uses one of CorelDRAW's own Fit commands, and 'originX'/'originY' " +
                "move the view origin in document units (pan).",
                Schema.Object(new JsonObject
                {
                    ["percent"] = Schema.Number("Zoom level in percent, e.g. 100. Omit to keep the current zoom."),
                    ["fit"] = Schema.Str("page, pageWidth, pageHeight, selection, allObjects, allPages or actual."),
                    ["originX"] = Schema.Number("View origin X, in document units. Needs 'originY'."),
                    ["originY"] = Schema.Number("View origin Y, in document units. Needs 'originX'.")
                }),
                args =>
                {
                    var percent = ToolArgs.Number(args, "percent", 0);
                    var hasOrigin = args.ContainsKey("originX") && args.ContainsKey("originY");
                    var fit = ToolArgs.String(args, "fit", null);
                    if (percent == 0 && !hasOrigin && fit == null)
                        throw new ToolArgumentException("Give 'percent', 'fit' and/or 'originX' + 'originY'.");
                    if (percent != 0 && percent < 1)
                        throw new ToolArgumentException("'percent' must be at least 1.");
                    var ox = ToolArgs.Number(args, "originX", 0);
                    var oy = ToolArgs.Number(args, "originY", 0);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var view = DocumentTools.RequireActiveDocument().ActiveWindow.ActiveView;
                        if (view == null) throw new InvalidOperationException("The document has no active view.");

                        if (fit != null)
                        {
                            switch (fit.Trim().ToLowerInvariant())
                            {
                                case "page": view.ToFitPage(); break;
                                case "pagewidth": view.ToFitPageWidth(); break;
                                case "pageheight": view.ToFitPageHeight(); break;
                                case "selection": view.ToFitSelection(); break;
                                case "allobjects": view.ToFitAllObjects(); break;
                                case "allpages": view.ToFitAllPages(); break;
                                case "actual": view.SetActualSize(); break;
                                default: throw new ToolArgumentException(
                                    "'fit' must be page, pageWidth, pageHeight, selection, allObjects, allPages or actual.");
                            }
                        }
                        if (percent != 0) view.Zoom = percent / 100.0;
                        if (hasOrigin)
                        {
                            view.OriginX = ox;
                            view.OriginY = oy;
                        }

                        return new JsonObject
                        {
                            ["zoom"] = CorelJson.SafeNumber(() => view.Zoom),
                            ["zoomPercent"] = CorelJson.SafeNumber(() => view.Zoom * 100),
                            ["originX"] = CorelJson.SafeNumber(() => view.OriginX),
                            ["originY"] = CorelJson.SafeNumber(() => view.OriginY)
                        };
                    });
                });

            registry.Define(
                "skew_shape",
                "Free transform: skew shapes by horizontal and vertical angles in degrees. " +
                "The other free transform handles are covered by move_shape / set_shape_size / rotate_shape.",
                Schema.WithTarget(
                    ("angleX", Schema.Number("Horizontal skew angle in degrees.")),
                    ("angleY", Schema.Number("Vertical skew angle in degrees."))),
                args =>
                {
                    var angleX = ToolArgs.Number(args, "angleX", 0);
                    var angleY = ToolArgs.Number(args, "angleY", 0);
                    if (angleX == 0 && angleY == 0)
                        throw new ToolArgumentException("Give 'angleX' and/or 'angleY'.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.Skew(angleX, angleY)));
                });
        }
    }
}
