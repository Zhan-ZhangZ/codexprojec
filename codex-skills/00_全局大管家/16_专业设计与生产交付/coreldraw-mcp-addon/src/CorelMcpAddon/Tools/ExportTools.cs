using System;
using System.Collections.Generic;
using System.IO;
using CorelMcp.Config;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Export tools: one generic exporter plus per-format shortcuts.</summary>
    public static class ExportTools
    {
        /// <summary>Supported "format" values, mapped to a CorelDRAW filter and to raster/vector.</summary>
        private static readonly Dictionary<string, (corel.cdrFilter filter, bool raster)> Formats =
            new Dictionary<string, (corel.cdrFilter, bool)>(StringComparer.OrdinalIgnoreCase)
            {
                // vector
                { "eps", (corel.cdrFilter.cdrEPS, false) },
                { "ai", (corel.cdrFilter.cdrAI, false) },
                { "pdf", (corel.cdrFilter.cdrPDF, false) },
                { "svg", (corel.cdrFilter.cdrSVG, false) },
                { "svgz", (corel.cdrFilter.cdrSVGZ, false) },
                { "dxf", (corel.cdrFilter.cdrDXF, false) },
                { "plt", (corel.cdrFilter.cdrHPGL, false) },
                { "wmf", (corel.cdrFilter.cdrWMF, false) },
                { "emf", (corel.cdrFilter.cdrEMF, false) },
                // raster
                { "png", (corel.cdrFilter.cdrPNG, true) },
                { "jpg", (corel.cdrFilter.cdrJPEG, true) },
                { "jpeg", (corel.cdrFilter.cdrJPEG, true) },
                { "tif", (corel.cdrFilter.cdrTIFF, true) },
                { "tiff", (corel.cdrFilter.cdrTIFF, true) },
                { "gif", (corel.cdrFilter.cdrGIF, true) },
                { "bmp", (corel.cdrFilter.cdrBMP, true) },
                { "webp", (corel.cdrFilter.cdrWEBP, true) },
                { "psd", (corel.cdrFilter.cdrPSD, true) },
                { "pcx", (corel.cdrFilter.cdrPCX, true) },
                { "tga", (corel.cdrFilter.cdrTGA, true) },
                { "ico", (corel.cdrFilter.cdrICO, true) }
            };

        private const string FormatList =
            "eps, ai, pdf, svg, svgz, dxf, plt, wmf, emf (vector); " +
            "png, jpg, tiff, gif, bmp, webp, psd, pcx, tga, ico (raster)";

        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "export_pdf",
                "Publish the active document to a PDF file (print-ready). 'range' selects what is " +
                "published: 'page' (the default) publishes the active page only, 'all' publishes " +
                "every page, 'selection' only the chosen shapes.",
                Schema.Required(("path", Schema.Str("Destination .pdf file path.")))
                      .WithTarget(("range", Schema.Str("'page' (default), 'all' or 'selection'."))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    return CorelBridge.Run<JsonValue>(() => PublishPdf(args, path));
                });

            registry.Define(
                "export",
                "Export the active page (or the chosen shapes) to any supported file format. " +
                "Raster formats need an explicit size: pass 'dpi', or 'width'/'height'. " +
                "Supported formats: " + FormatList + ".",
                Schema.Required(
                    ("path", Schema.Str("Full path of the file to write; must stay inside AllowedRoots when that is set.")),
                    ("format", Schema.Str("File format without the leading dot, e.g. eps, pdf, svg, dxf, png, jpg.")))
                      .WithTarget(
                          ("range", Schema.Str("'page' (default), 'all' or 'selection'.")),
                          ("dpi", Schema.Integer("Raster resolution in dots per inch.")),
                          ("width", Schema.Integer("Output width in pixels; overrides 'dpi'.")),
                          ("height", Schema.Integer("Output height in pixels; overrides 'dpi'.")),
                          ("transparent", Schema.Bool("Transparent background (alpha). Default false.")),
                          ("antiAliasing", Schema.Str("none, normal (default) or supersampling.")),
                          ("dithered", Schema.Bool("Dither the output. Default false.")),
                          ("colorProfile", Schema.Bool("Use the colour profile. Default true.")),
                          ("maintainLayers", Schema.Bool("Keep layers as separate objects. Default true.")),
                          ("compression", Schema.Str("none, zip (default) or lzw."))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    var format = ToolArgs.String(args, "format").Trim().TrimStart('.').ToLowerInvariant();
                    (corel.cdrFilter filter, bool raster) entry;
                    if (!Formats.TryGetValue(format, out entry))
                        throw new ToolArgumentException(
                            "Unsupported format '" + format + "'. Supported: " + FormatList + ".");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        // PDF goes through the publisher, not the generic Export filter: the PDF
                        // filter writes the file but then raises E_FAIL, and selection publishing
                        // is only available through PublishToPDF's settings.
                        if (format == "pdf") return PublishPdf(args, path);

                        var doc = DocumentTools.RequireActiveDocument();
                        var range = ResolveRange(args, out var selection);
                        return entry.raster
                            ? ExportRaster(args, path, format, entry.filter, doc, range, selection)
                            : ExportVector(doc, path, format, entry.filter, range);
                    });
                });

            registry.Define(
                "export_png",
                "Export the active page (or the chosen shapes) to a PNG file. " +
                "Needs an explicit size: pass 'dpi', or 'width'/'height'.",
                Schema.Required(("path", Schema.Str("Destination .png file path.")))
                      .WithTarget(
                          ("range", Schema.Str("'page' (default), 'all' or 'selection'.")),
                          ("dpi", Schema.Integer("Raster resolution in dots per inch.")),
                          ("width", Schema.Integer("Output width in pixels; overrides 'dpi'.")),
                          ("height", Schema.Integer("Output height in pixels; overrides 'dpi'.")),
                          ("transparent", Schema.Bool("Transparent background (alpha). Default false.")),
                          ("antiAliasing", Schema.Str("none, normal (default) or supersampling.")),
                          ("dithered", Schema.Bool("Dither the output. Default false.")),
                          ("colorProfile", Schema.Bool("Use the colour profile. Default true.")),
                          ("maintainLayers", Schema.Bool("Keep layers as separate objects. Default true.")),
                          ("compression", Schema.Str("none, zip (default) or lzw."))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var doc = DocumentTools.RequireActiveDocument();
                        var range = ResolveRange(args, out var selection);
                        return ExportRaster(args, path, "png", corel.cdrFilter.cdrPNG, doc, range, selection);
                    });
                });

            registry.Define(
                "export_svg",
                "Export the active page (or the chosen shapes) to an SVG file.",
                Schema.Required(("path", Schema.Str("Destination .svg file path.")))
                      .WithTarget(("range", Schema.Str("'page' (default), 'all' or 'selection'."))),
                args => VectorShortcut(args, "svg", corel.cdrFilter.cdrSVG));

            registry.Define(
                "export_dxf",
                "Export the active page (or the chosen shapes) to a DXF file (for laser cutting / CAD).",
                Schema.Required(("path", Schema.Str("Destination .dxf file path.")))
                      .WithTarget(("range", Schema.Str("'page' (default), 'all' or 'selection'."))),
                args => VectorShortcut(args, "dxf", corel.cdrFilter.cdrDXF));
        }

        private static JsonValue VectorShortcut(JsonObject args, string format, corel.cdrFilter filter)
        {
            var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
            return CorelBridge.Run<JsonValue>(() =>
            {
                var doc = DocumentTools.RequireActiveDocument();
                var range = ResolveRange(args, out _);
                return ExportVector(doc, path, format, filter, range);
            });
        }

        private static JsonValue ExportVector(corel.Document doc, string path, string format,
            corel.cdrFilter filter, corel.cdrExportRange range)
        {
            var full = FullPath(path);
            WithUnitPreserved(doc, () => doc.Export(full, filter, range, null, null));
            if (!File.Exists(full))
                throw new InvalidOperationException("Export produced no file at '" + full + "'.");
            return Done(path, format);
        }

        /// <summary>Publish the active document/selection to PDF (the working PDF path).</summary>
        private static JsonValue PublishPdf(JsonObject args, string path)
        {
            var doc = DocumentTools.RequireActiveDocument();
            var range = ResolveRange(args, out var selection);
            // Publishing to PDF ignores the active page unless PublishRange is set explicitly:
            // left alone, CorelDRAW quietly publishes the whole document. cdrExportRange and
            // pdfExportRange share their numeric values (whole 0 / page 1 / selection 2).
            var publish = selection != null
                ? corel.pdfExportRange.pdfSelection
                : (corel.pdfExportRange)(int)range;
            var previous = doc.PDFSettings.PublishRange;
            try
            {
                doc.PDFSettings.PublishRange = publish;
                WithUnitPreserved(doc, () => doc.PublishToPDF(path));
            }
            finally
            {
                doc.PDFSettings.PublishRange = previous;
            }

            var full = FullPath(path);
            if (!File.Exists(full))
                throw new InvalidOperationException("PDF export produced no file at '" + full + "'.");
            return Done(path, "pdf");
        }

        /// <summary>
        /// Raster export. A size is mandatory: falling back to CorelDRAW's own raster default is
        /// not an option because that default can be enormous (observed: 72 000 x 42 000 px for an
        /// A4 page), which pegs the CPU and hangs CorelDRAW.
        /// </summary>
        private static JsonValue ExportRaster(JsonObject args, string path, string format,
            corel.cdrFilter filter, corel.Document doc, corel.cdrExportRange range, List<corel.Shape> selection)
        {
            var dpi = ToolArgs.Int(args, "dpi", 0);
            if (dpi != 0 && (dpi < 18 || dpi > 1200))
                throw new ToolArgumentException("'dpi' must be between 18 and 1200.");
            var requestedWidth = ToolArgs.Int(args, "width", 0);
            var requestedHeight = ToolArgs.Int(args, "height", 0);
            if ((requestedWidth > 0) != (requestedHeight > 0))
                throw new ToolArgumentException("Give both 'width' and 'height', or neither.");

            int widthPx, heightPx;
            if (requestedWidth > 0)
            {
                widthPx = requestedWidth;
                heightPx = requestedHeight;
            }
            else if (dpi > 0)
            {
                double widthMm, heightMm;
                if (selection != null)
                {
                    var size = SelectionSizeMm(selection, doc.Unit);
                    widthMm = size.widthMm;
                    heightMm = size.heightMm;
                }
                else
                {
                    var page = doc.ActivePage;
                    if (page == null) throw new InvalidOperationException("The active document has no active page.");
                    widthMm = Units.ToMillimeters(page.SizeWidth, doc.Unit);
                    heightMm = Units.ToMillimeters(page.SizeHeight, doc.Unit);
                }
                widthPx = Math.Max(1, (int)Math.Round(widthMm / Units.MmPerInch * dpi));
                heightPx = Math.Max(1, (int)Math.Round(heightMm / Units.MmPerInch * dpi));
            }
            else
            {
                throw new ToolArgumentException(
                    "Raster export needs a size: pass 'dpi', or 'width'/'height'.");
            }

            var antiAliasing = ParseAntiAliasing(ToolArgs.String(args, "antiAliasing", "normal"));
            var compression = ParseCompression(ToolArgs.String(args, "compression", "zip"));
            var dithered = ToolArgs.Bool(args, "dithered", false);
            var transparent = ToolArgs.Bool(args, "transparent", false);
            var colorProfile = ToolArgs.Bool(args, "colorProfile", true);
            var maintainLayers = ToolArgs.Bool(args, "maintainLayers", true);

            var full = FullPath(path);
            Log.Info("export " + format + ": " + widthPx + "x" + heightPx + " px" +
                     (dpi > 0 ? " at " + dpi + " dpi" : "") +
                     (selection != null ? " (selection)" : " (page)") + ".");

            WithUnitPreserved(doc, () => TryRasterExport(doc, full, filter, range, widthPx, heightPx, dpi,
                antiAliasing, dithered, transparent, colorProfile, maintainLayers, compression));

            if (!File.Exists(full))
                throw new InvalidOperationException(
                    "Export produced no file at '" + full + "' (tried Export, ExportEx and ExportBitmap).");

            return Done(path, format);
        }

        /// <summary>
        /// Resolve the export range from the "range" argument. "page" (the default) exports the
        /// active page, "all" every page; "selection" resolves the chosen shapes (via the standard
        /// selector, or the current CorelDRAW selection), makes them the selection and returns
        /// <c>cdrSelection</c> — <paramref name="selection"/> is then the resolved shapes.
        /// Runs on the CorelDRAW thread.
        /// </summary>
        private static corel.cdrExportRange ResolveRange(JsonObject args, out List<corel.Shape> selection)
        {
            var value = ToolArgs.String(args, "range", "page").Trim().ToLowerInvariant();
            if (value == "page")
            {
                selection = null;
                return corel.cdrExportRange.cdrCurrentPage;
            }
            if (value == "all")
            {
                selection = null;
                return corel.cdrExportRange.cdrAllPages;
            }
            if (value != "selection")
                throw new ToolArgumentException("'range' must be 'page', 'all' or 'selection'.");

            var shapes = ShapeTarget.ResolveForSelection(args);
            ShapeTarget.ToRange(shapes).CreateSelection();
            selection = shapes;
            return corel.cdrExportRange.cdrSelection;
        }

        /// <summary>Bounding-box width and height of the shapes, converted to millimetres.</summary>
        private static (double widthMm, double heightMm) SelectionSizeMm(List<corel.Shape> shapes, corel.cdrUnit unit)
        {
            double left = double.MaxValue, right = double.MinValue;
            double bottom = double.MaxValue, top = double.MinValue;
            foreach (var shape in shapes)
            {
                left = Math.Min(left, shape.LeftX);
                right = Math.Max(right, shape.RightX);
                bottom = Math.Min(bottom, shape.BottomY);
                top = Math.Max(top, shape.TopY);
            }
            if (left > right || bottom > top)
                throw new ToolArgumentException("The selection has no measurable bounds.");

            return (Units.ToMillimeters(right - left, unit), Units.ToMillimeters(top - bottom, unit));
        }

        /// <summary>Map the "antiAliasing" argument to a cdrAntiAliasingType.</summary>
        private static corel.cdrAntiAliasingType ParseAntiAliasing(string value)
        {
            switch ((value ?? "normal").Trim().ToLowerInvariant())
            {
                case "none": return corel.cdrAntiAliasingType.cdrNoAntiAliasing;
                case "normal": return corel.cdrAntiAliasingType.cdrNormalAntiAliasing;
                case "supersampling": return corel.cdrAntiAliasingType.cdrSupersampling;
                default: throw new ToolArgumentException("'antiAliasing' must be 'none', 'normal' or 'supersampling'.");
            }
        }

        /// <summary>Map the "compression" argument to a cdrCompressionType.</summary>
        private static corel.cdrCompressionType ParseCompression(string value)
        {
            switch ((value ?? "zip").Trim().ToLowerInvariant())
            {
                case "none": return corel.cdrCompressionType.cdrCompressionNone;
                case "zip": return corel.cdrCompressionType.cdrCompressionZIP;
                case "lzw": return corel.cdrCompressionType.cdrCompressionLZW;
                default: throw new ToolArgumentException("'compression' must be 'none', 'zip' or 'lzw'.");
            }
        }

        /// <summary>
        /// Write a raster image. CorelDRAW's raster exporters are temperamental: on some builds
        /// <c>ExportBitmap</c> and <c>ExportEx</c> return without writing anything, while the
        /// plain <c>Export</c> (with a raster options object) works. The paths are tried in
        /// order and the first one that produces a file wins; the log records which one it was.
        /// Returns true when a file exists afterwards.
        /// </summary>
        private static bool TryRasterExport(corel.Document doc, string path, corel.cdrFilter filter,
            corel.cdrExportRange range, int widthPx, int heightPx, int dpi,
            corel.cdrAntiAliasingType antiAliasing, bool dithered, bool transparent,
            bool colorProfile, bool maintainLayers, corel.cdrCompressionType compression)
        {
            var options = CorelBridge.Application.CreateStructExportOptions();
            options.ImageType = corel.cdrImageType.cdrRGBColorImage;
            options.SizeX = widthPx;
            options.SizeY = heightPx;
            options.ResolutionX = dpi;
            options.ResolutionY = dpi;
            options.AntiAliasingType = antiAliasing;
            options.Dithered = dithered;
            options.Transparent = transparent;
            options.UseColorProfile = colorProfile;
            options.MaintainLayers = maintainLayers;
            options.Compression = compression;
            options.Overwrite = true;

            return Attempt("Export", path, () => doc.Export(path, filter, range, options, null))
                || Attempt("ExportEx", path, () => doc.ExportEx(path, filter, range, options, null))
                || Attempt("ExportBitmap", path, () => doc.ExportBitmap(
                       path, filter, range, corel.cdrImageType.cdrRGBColorImage,
                       widthPx, heightPx, dpi, dpi, antiAliasing, dithered, transparent,
                       colorProfile, maintainLayers, compression, null, null));
        }

        /// <summary>Run one export attempt and report whether it produced the file.</summary>
        private static bool Attempt(string name, string path, Action export)
        {
            try
            {
                export();
            }
            catch (Exception ex)
            {
                Log.Warn("export: " + name + " failed: " + ex.Message);
                return false;
            }

            bool wrote = File.Exists(path);
            Log.Info("export: " + name + (wrote ? " wrote the file." : " produced no file."));
            return wrote;
        }

        private static string FullPath(string path)
        {
            try
            {
                return Path.GetFullPath(path);
            }
            catch
            {
                return path;
            }
        }

        /// <summary>
        /// CorelDRAW's Export/ExportBitmap can switch the document unit to the export
        /// filter's unit (observed: mm -> inch after a PNG export). That silently changes
        /// how every later coordinate is interpreted, so the unit is restored afterwards.
        /// </summary>
        private static void WithUnitPreserved(corel.Document doc, Action export)
        {
            var unit = doc.Unit;
            try
            {
                export();
            }
            finally
            {
                try
                {
                    if (doc.Unit != unit)
                    {
                        Log.Warn("Export changed the document unit from " + unit + " to " + doc.Unit +
                                 "; restoring " + unit + ".");
                        doc.Unit = unit;
                    }
                }
                catch (Exception ex)
                {
                    Log.Error("Could not restore the document unit", ex);
                }
            }
        }

        private static JsonValue Done(string path, string format)
        {
            string full = FullPath(path);

            bool exists = File.Exists(full);
            long size = exists ? new FileInfo(full).Length : 0;
            Log.Info("Exported " + format.ToUpperInvariant() + " -> " + full + " (" + size + " bytes).");
            return new JsonObject
            {
                ["exported"] = true,
                ["format"] = format,
                ["path"] = full,
                ["exists"] = exists,
                ["bytes"] = size
            };
        }
    }

    /// <summary>Unit conversions between the document unit and millimetres.</summary>
    public static class Units
    {
        public const double MmPerInch = 25.4;

        public static double ToMillimeters(double value, corel.cdrUnit unit)
        {
            switch (unit)
            {
                case corel.cdrUnit.cdrMillimeter: return value;
                case corel.cdrUnit.cdrCentimeter: return value * 10.0;
                case corel.cdrUnit.cdrMeter: return value * 1000.0;
                case corel.cdrUnit.cdrKilometer: return value * 1000000.0;
                case corel.cdrUnit.cdrInch: return value * MmPerInch;
                case corel.cdrUnit.cdrFoot: return value * MmPerInch * 12.0;
                case corel.cdrUnit.cdrYard: return value * MmPerInch * 36.0;
                case corel.cdrUnit.cdrMile: return value * MmPerInch * 63360.0;
                case corel.cdrUnit.cdrPoint: return value * MmPerInch / 72.0;
                case corel.cdrUnit.cdrPica: return value * MmPerInch / 6.0;
                case corel.cdrUnit.cdrCicero: return value * MmPerInch / 72.0 * 12.0;
                default: return value;
            }
        }

        /// <summary>
        /// The dimension-label unit that matches the document unit. CorelDRAW keeps a separate
        /// enum for dimension text; without this mapping a drawing in inches gets its
        /// measurements labelled in millimetres.
        /// </summary>
        public static corel.cdrDimensionLinearUnits DimensionUnits(corel.cdrUnit unit)
        {
            switch (unit)
            {
                case corel.cdrUnit.cdrMillimeter: return corel.cdrDimensionLinearUnits.cdrDimensionUnitMillimeters;
                case corel.cdrUnit.cdrCentimeter: return corel.cdrDimensionLinearUnits.cdrDimensionUnitCentimeters;
                case corel.cdrUnit.cdrMeter: return corel.cdrDimensionLinearUnits.cdrDimensionUnitMeters;
                case corel.cdrUnit.cdrKilometer: return corel.cdrDimensionLinearUnits.cdrDimensionUnitKilometers;
                case corel.cdrUnit.cdrInch: return corel.cdrDimensionLinearUnits.cdrDimensionUnitInches;
                case corel.cdrUnit.cdrFoot: return corel.cdrDimensionLinearUnits.cdrDimensionUnitFtX;
                case corel.cdrUnit.cdrYard: return corel.cdrDimensionLinearUnits.cdrDimensionUnitYards;
                case corel.cdrUnit.cdrMile: return corel.cdrDimensionLinearUnits.cdrDimensionUnitMiles;
                case corel.cdrUnit.cdrPoint: return corel.cdrDimensionLinearUnits.cdrDimensionUnitPoints;
                case corel.cdrUnit.cdrPica: return corel.cdrDimensionLinearUnits.cdrDimensionUnitPicas;
                case corel.cdrUnit.cdrCicero: return corel.cdrDimensionLinearUnits.cdrDimensionUnitCiceros;
                default: return corel.cdrDimensionLinearUnits.cdrDimensionUnitMillimeters;
            }
        }
    }
}
