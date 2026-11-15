using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Text creation and editing tools.</summary>
    public static class TextTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "create_text",
                "Create artistic text on the active layer. Coordinates are in the document unit. " +
                "When 'font' or 'size' are omitted, CorelDRAW's own defaults are used.",
                Schema.Required(
                    ("text", Schema.Str("Text to place, as plain text.")),
                    ("x", Schema.Number("X position, in document units.")),
                    ("y", Schema.Number("Baseline Y position, in document units.")))
                    .WithOptional(
                        ("font", Schema.Str("Font family name. Omit to use CorelDRAW's default.")),
                        ("size", Schema.Number("Font size in points. Omit to use CorelDRAW's default.")),
                        ("alignment", Schema.Str("left (default), center, right or justify."))),
                args =>
                {
                    var text = ToolArgs.String(args, "text");
                    double x = ToolArgs.Number(args, "x");
                    double y = ToolArgs.Number(args, "y");
                    var font = ToolArgs.String(args, "font", "");
                    var size = (float)ToolArgs.Number(args, "size", 0);
                    var alignment = ParseAlignment(ToolArgs.String(args, "alignment", "left"));
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var shape = layer.CreateArtisticText(
                            x, y, text,
                            corel.cdrTextLanguage.cdrLanguageMixed,
                            corel.cdrTextCharSet.cdrCharSetMixed,
                            font, size,
                            corel.cdrTriState.cdrUndefined,
                            corel.cdrTriState.cdrUndefined,
                            corel.cdrFontLine.cdrMixedFontLine,
                            alignment);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "get_text",
                "List every text object in the document, across all pages, with its content.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var doc = DocumentTools.RequireActiveDocument();
                    var array = new JsonArray();
                    foreach (var shape in EnumerateDocumentShapes(doc))
                    {
                        if (shape.Type != corel.cdrShapeType.cdrTextShape) continue;
                        var text = CorelJson.Safe(() => shape.Text?.Story?.Text);
                        array.Add(new JsonObject
                        {
                            ["name"] = CorelJson.Safe(() => shape.Name),
                            ["isArtistic"] = CorelJson.SafeInt(() => shape.Text.IsArtisticText ? 1 : 0) == 1,
                            ["text"] = text ?? string.Empty
                        });
                    }
                    return new JsonObject { ["count"] = array.Count, ["texts"] = array };
                }));

            registry.Define(
                "create_paragraph_text",
                "Create paragraph text inside a rectangular frame on the active layer.",
                Schema.Required(
                    ("left", Schema.Number("Left edge X coordinate of the frame, in document units.")),
                    ("top", Schema.Number("Top edge Y coordinate of the frame, in document units.")),
                    ("right", Schema.Number("Right edge X coordinate of the frame, in document units.")),
                    ("bottom", Schema.Number("Bottom edge of the frame.")),
                    ("text", Schema.Str("Text to place, as plain text.")))
                    .WithOptional(
                        ("font", Schema.Str("Font family name. Omit to use CorelDRAW's default.")),
                        ("size", Schema.Number("Font size in points. Omit to use CorelDRAW's default.")),
                        ("alignment", Schema.Str("left (default), center, right or justify."))),
                args =>
                {
                    var left = ToolArgs.Number(args, "left");
                    var top = ToolArgs.Number(args, "top");
                    var right = ToolArgs.Number(args, "right");
                    var bottom = ToolArgs.Number(args, "bottom");
                    var text = ToolArgs.String(args, "text");
                    var font = ToolArgs.String(args, "font", "");
                    var size = (float)ToolArgs.Number(args, "size", 0);
                    var alignment = ParseAlignment(ToolArgs.String(args, "alignment", "left"));

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var shape = layer.CreateParagraphText(
                            left, top, right, bottom, text,
                            corel.cdrTextLanguage.cdrLanguageMixed,
                            corel.cdrTextCharSet.cdrCharSetMixed,
                            font, size,
                            corel.cdrTriState.cdrUndefined,
                            corel.cdrTriState.cdrUndefined,
                            corel.cdrFontLine.cdrMixedFontLine,
                            alignment);
                        return CorelJson.ShapeToJson(shape, CorelJson.IndexOn(layer, shape));
                    });
                });

            registry.Define(
                "fit_text_to_path",
                "Fit the selected text object to a path (text on a curve).",
                Schema.WithTarget(
                    ("pathIndex", Schema.Integer("1-based index of the path shape on the active layer.")),
                    ("pathName", Schema.Str("Name of the path shape the text follows."))),
                args =>
                {
                    var pathIndex = ToolArgs.Int(args, "pathIndex", 0);
                    var pathName = ToolArgs.String(args, "pathName", null);
                    if (pathIndex == 0 && string.IsNullOrEmpty(pathName))
                        throw new ToolArgumentException("Give 'pathIndex' or 'pathName'.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var path = CorelJson.FindShape(layer, pathIndex, pathName);
                        if (path == null) throw new ToolArgumentException("The path shape was not found.");
                        if (path.Type == corel.cdrShapeType.cdrTextShape)
                            throw new ToolArgumentException("The path must not be a text object.");

                        return ShapeTarget.Apply(args, shape =>
                        {
                            var text = shape.Text;
                            if (text == null) throw new ToolArgumentException("The shape is not a text object.");
                            text.FitToPath(path);
                        });
                    });
                });

            registry.Define(
                "place_text_inside",
                "Place a text object inside a closed shape (text in a shape). Only paragraph " +
                "text can be placed inside a shape.",
                Schema.WithTarget(
                    ("containerIndex", Schema.Integer("1-based index of the container shape on the active layer.")),
                    ("containerName", Schema.Str("Name of the container shape."))),
                args =>
                {
                    var containerIndex = ToolArgs.Int(args, "containerIndex", 0);
                    var containerName = ToolArgs.String(args, "containerName", null);
                    if (containerIndex == 0 && string.IsNullOrEmpty(containerName))
                        throw new ToolArgumentException("Give 'containerIndex' or 'containerName'.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = ShapeTools.RequireActiveLayer();
                        var container = CorelJson.FindShape(layer, containerIndex, containerName);
                        if (container == null) throw new ToolArgumentException("The container shape was not found.");

                        // The object model takes the text as the argument and the container as
                        // the receiver: container.PlaceTextInside(textShape).
                        var text = ShapeTarget.Resolve(args)[0];
                        if (text.Type != corel.cdrShapeType.cdrTextShape)
                            throw new ToolArgumentException(
                                "The shape matched by 'index'/'name' is not a text object.");
                        container.PlaceTextInside(text);

                        return new JsonObject
                        {
                            ["placed"] = 1,
                            ["container"] = CorelJson.Safe(() => container.Name)
                        };
                    });
                });

            registry.Define(
                "convert_text_type",
                "Convert text objects between artistic and paragraph text.",
                Schema.WithTarget(("textType", Schema.Str("'artistic' or 'paragraph'."))),
                args =>
                {
                    var type = ToolArgs.String(args, "textType", "paragraph").Trim().ToLowerInvariant();
                    if (type != "artistic" && type != "paragraph")
                        throw new ToolArgumentException("'textType' must be 'artistic' or 'paragraph'.");

                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            var text = shape.Text;
                            if (text == null) throw new ToolArgumentException("The shape is not a text object.");
                            if (type == "artistic") text.ConvertToArtistic();
                            else text.ConvertToParagraph();
                        }));
                });

            registry.Define(
                "replace_text",
                "Find and replace a substring across every text object in the document, on all pages.",
                Schema.Required(
                    ("find", Schema.Str("Text to search for, case-sensitive.")),
                    ("replace", Schema.Str("Text that replaces each match."))),
                args =>
                {
                    var find = ToolArgs.String(args, "find");
                    var replace = ToolArgs.String(args, "replace");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        if (string.IsNullOrEmpty(find))
                            throw new ToolArgumentException("'find' must not be empty.");

                        var doc = DocumentTools.RequireActiveDocument();
                        int changedShapes = 0;
                        int changedOccurrences = 0;
                        foreach (var shape in EnumerateDocumentShapes(doc))
                        {
                            if (shape.Type != corel.cdrShapeType.cdrTextShape) continue;
                            var story = CorelJson.Safe(() => shape.Text?.Story);
                            if (story == null) continue;
                            var current = CorelJson.Safe(() => story.Text);
                            if (string.IsNullOrEmpty(current) || current.IndexOf(find, StringComparison.Ordinal) < 0)
                                continue;

                            int occurrences = CountOccurrences(current, find);
                            story.Text = current.Replace(find, replace);
                            changedShapes++;
                            changedOccurrences += occurrences;
                        }
                        Log.Info("replace_text: " + changedOccurrences + " occurrence(s) in " + changedShapes + " shape(s).");
                        return new JsonObject
                        {
                            ["shapesChanged"] = changedShapes,
                            ["occurrencesChanged"] = changedOccurrences
                        };
                    });
                });

            registry.Define(
                "convert_text_to_curves",
                "Convert text objects to curves (paths) across the document, on all pages.",
                Schema.Object(new JsonObject
                {
                    ["index"] = Schema.Integer("Convert only the shape at this 1-based index on the active layer."),
                    ["name"] = Schema.Str("Convert only the shape with this name.")
                }),
                args =>
                {
                    int index = ToolArgs.Int(args, "index", 0);
                    string name = ToolArgs.String(args, "name", null);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        int converted = 0;
                        if (index > 0 || !string.IsNullOrEmpty(name))
                        {
                            var layer = ShapeTools.RequireActiveLayer();
                            var shape = CorelJson.FindShape(layer, index, name);
                            if (shape == null) throw new ToolArgumentException("Shape not found.");
                            if (shape.Type != corel.cdrShapeType.cdrTextShape)
                                throw new ToolArgumentException("Shape is not a text object.");
                            shape.ConvertToCurves();
                            converted = 1;
                        }
                        else
                        {
                            var doc = DocumentTools.RequireActiveDocument();
                            foreach (var shape in EnumerateDocumentShapes(doc))
                            {
                                if (shape.Type != corel.cdrShapeType.cdrTextShape) continue;
                                shape.ConvertToCurves();
                                converted++;
                            }
                        }
                        Log.Info("Converted " + converted + " text object(s) to curves.");
                        return new JsonObject { ["converted"] = converted };
                    });
                });
        }

        /// <summary>Map the "alignment" argument to a cdrAlignment.</summary>
        private static corel.cdrAlignment ParseAlignment(string value)
        {
            switch ((value ?? "left").Trim().ToLowerInvariant())
            {
                case "left": return corel.cdrAlignment.cdrLeftAlignment;
                case "center": return corel.cdrAlignment.cdrCenterAlignment;
                case "right": return corel.cdrAlignment.cdrRightAlignment;
                case "justify": return corel.cdrAlignment.cdrFullJustifyAlignment;
                default: throw new ToolArgumentException("'alignment' must be 'left', 'center', 'right' or 'justify'.");
            }
        }

        /// <summary>Snapshot a Shapes collection so it can be iterated safely while editing.</summary>
        internal static System.Collections.Generic.List<corel.Shape> EnumerateShapes(corel.Shapes shapes)
        {
            var list = new System.Collections.Generic.List<corel.Shape>();
            if (shapes == null) return list;
            int count = shapes.Count;
            for (int i = 1; i <= count; i++)
            {
                corel.Shape shape = null;
                try { shape = shapes[i]; } catch { }
                if (shape != null) list.Add(shape);
            }
            return list;
        }

        /// <summary>
        /// Snapshot every shape of every page. Document.SelectableShapes only tracks the ACTIVE
        /// page, so document-wide editing has to walk the pages explicitly. Unlike
        /// SelectableShapes this also picks up locked and hidden shapes.
        /// </summary>
        internal static System.Collections.Generic.List<corel.Shape> EnumerateDocumentShapes(corel.Document document)
        {
            var list = new System.Collections.Generic.List<corel.Shape>();
            if (document == null) return list;
            int pages = 0;
            try { pages = document.Pages.Count; } catch { }
            for (int page = 1; page <= pages; page++)
            {
                corel.Page current = null;
                try { current = document.Pages[page]; } catch { }
                if (current == null) continue;
                list.AddRange(EnumerateShapes(current.Shapes));
            }
            return list;
        }

        private static int CountOccurrences(string haystack, string needle)
        {
            int count = 0, index = 0;
            while ((index = haystack.IndexOf(needle, index, StringComparison.Ordinal)) >= 0)
            {
                count++;
                index += needle.Length;
            }
            return count;
        }
    }
}
