using System;
using CorelMcp.Config;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Fill, outline and transparency tools.</summary>
    public static class ColorTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "set_fill_color",
                "Apply a uniform fill. Give 'color' as hex (\"#FFCC00\"), or 'cmyk' as " +
                "\"C,M,Y,K\", or 'gray' as 0-100.",
                Schema.WithTarget(
                    ("color", Schema.Str("Hex colour, e.g. \"#C9A227\".")),
                    ("cmyk", Schema.Str("CMYK values, e.g. \"0,25,90,20\".")),
                    ("gray", Schema.Number("Grey level 0-100 (0 is black, 100 is white)."))),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var color = ShapeTarget.ResolveColor(args);
                    return ShapeTarget.Apply(args, shape => shape.Fill.ApplyUniformFill(color));
                }));

            registry.Define(
                "set_fill_gradient",
                "Apply a two-colour fountain (gradient) fill.",
                Schema.WithTarget(
                    ("from", Schema.Str("Start colour as hex, e.g. \"#241238\".")),
                    ("to", Schema.Str("End colour as hex, e.g. \"#C9A227\".")),
                    ("gradientType", Schema.Str("linear (default), radial, conical or square.")),
                    ("angle", Schema.Number("Angle in degrees for linear fills. Default 90.")),
                    ("steps", Schema.Integer("Gradient steps. Default 256.")),
                    ("midpoint", Schema.Integer("Blend midpoint 0-100. Default 50."))),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var start = ShapeTarget.ResolveColor(ShapeTarget.WithColor(args, "from"));
                    var end = ShapeTarget.ResolveColor(ShapeTarget.WithColor(args, "to"));

                    var gradientType = ToolArgs.String(args, "gradientType", "linear").ToLowerInvariant();
                    corel.cdrFountainFillType fillType;
                    switch (gradientType)
                    {
                        case "linear": fillType = corel.cdrFountainFillType.cdrLinearFountainFill; break;
                        case "radial": fillType = corel.cdrFountainFillType.cdrRadialFountainFill; break;
                        case "conical": fillType = corel.cdrFountainFillType.cdrConicalFountainFill; break;
                        case "square": fillType = corel.cdrFountainFillType.cdrSquareFountainFill; break;
                        default: throw new ToolArgumentException("Unknown gradient type '" + gradientType + "'.");
                    }

                    var angle = ToolArgs.Number(args, "angle", 90.0);
                    var steps = ToolArgs.Int(args, "steps", 256);
                    if (steps < 2) throw new ToolArgumentException("'steps' must be at least 2.");
                    var midpoint = (int)ToolArgs.Number(args, "midpoint", 50);

                    return ShapeTarget.Apply(args, shape => shape.Fill.ApplyFountainFill(
                        start, end, fillType, angle, steps, 0, midpoint,
                        corel.cdrFountainFillBlendType.cdrDirectFountainFillBlend, 0, 0));
                }));

            registry.Define(
                "set_fill_none",
                "Remove the fill so the shape becomes transparent inside.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                    ShapeTarget.Apply(args, shape => shape.Fill.ApplyNoFill())));

            registry.Define(
                "set_fill_pattern",
                "Apply a pattern fill (two-colour, full-colour or bitmap pattern).",
                Schema.WithTarget(
                    ("patternType", Schema.Str("twoColor (default), fullColor or bitmap.")),
                    ("pattern", Schema.Str("Pattern name, or the path of a bitmap pattern.")),
                    ("index", Schema.Integer("Index of the pattern in the pattern list. Default 1.")),
                    ("foreground", Schema.Str("Foreground colour as hex, e.g. \"#FFCC00\".")),
                    ("background", Schema.Str("Background colour as hex, e.g. \"#FFFFFF\".")),
                    ("fillWidth", Schema.Bool("Stretch the pattern to fill the shape. Default false."))),
                args =>
                {
                    var name = ToolArgs.String(args, "patternType", "twoColor").Trim().ToLowerInvariant();
                    corel.cdrPatternFillType type;
                    if (name == "twocolor") type = corel.cdrPatternFillType.cdrTwoColorPattern;
                    else if (name == "fullcolor") type = corel.cdrPatternFillType.cdrFullColorPattern;
                    else if (name == "bitmap") type = corel.cdrPatternFillType.cdrBitmapPattern;
                    else throw new ToolArgumentException("'patternType' must be twoColor, fullColor or bitmap.");

                    var pattern = AllowedPattern(ToolArgs.String(args, "pattern", ""));
                    var index = ToolArgs.Int(args, "index", 1);
                    var fillWidth = ToolArgs.Bool(args, "fillWidth", false);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var foreground = OptionalColor(args, "foreground", 0, 0, 0);
                        var background = OptionalColor(args, "background", 255, 255, 255);
                        return ShapeTarget.Apply(args, shape => shape.Fill.ApplyPatternFill(
                            type, pattern, index, foreground, background, fillWidth));
                    });
                });

            registry.Define(
                "set_fill_texture",
                "Apply a texture fill from one of CorelDRAW's texture libraries.",
                Schema.WithTarget(
                    ("library", Schema.Str("Texture library name, e.g. \"Samples 5\".")),
                    ("texture", Schema.Str("Texture name, e.g. \"Water 2C\"."))),
                args =>
                {
                    var library = ToolArgs.String(args, "library");
                    var texture = ToolArgs.String(args, "texture");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.Fill.ApplyTextureFill(library, texture)));
                });

            registry.Define(
                "set_fill_postscript",
                "Apply a PostScript fill by name or by index.",
                Schema.WithTarget(
                    ("name", Schema.Str("Name of a PostScript fill, as listed by CorelDRAW.")),
                    ("index", Schema.Integer("Index of the fill in the PostScript fill list."))),
                args =>
                {
                    var name = ToolArgs.String(args, "name", null);
                    if (!string.IsNullOrEmpty(name))
                        return CorelBridge.Run<JsonValue>(() =>
                            ShapeTarget.Apply(args, shape => shape.Fill.ApplyPostscriptFill(name)));

                    var index = ToolArgs.Int(args, "index", 0);
                    if (index <= 0)
                        throw new ToolArgumentException("Give 'name' or a positive 'index'.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.Fill.ApplyPostscriptFill(index)));
                });

            registry.Define(
                "set_outline_color",
                "Set the outline colour. Same colour arguments as set_fill_color.",
                Schema.WithTarget(
                    ("color", Schema.Str("Hex colour, e.g. \"#C9A227\".")),
                    ("cmyk", Schema.Str("CMYK values, e.g. \"0,25,90,20\".")),
                    ("gray", Schema.Number("Grey level 0-100 (0 is black, 100 is white)."))),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var color = ShapeTarget.ResolveColor(args);
                    return ShapeTarget.Apply(args, shape =>
                    {
                        shape.Outline.Type = corel.cdrOutlineType.cdrOutline;
                        shape.Outline.Color = color;
                    });
                }));

            registry.Define(
                "set_outline_width",
                "Set the outline width, in the document unit.",
                Schema.WithTarget(("width", Schema.Number("Outline width in document units."))),
                args =>
                {
                    var width = ToolArgs.Number(args, "width");
                    if (width <= 0) throw new ToolArgumentException("'width' must be greater than zero.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            shape.Outline.Type = corel.cdrOutlineType.cdrOutline;
                            shape.Outline.Width = width;
                        }));
                });

            registry.Define(
                "set_outline_none",
                "Remove the outline from shapes, leaving a pure fill. Takes the usual shape selector (index / name / type / all); with no selector it applies to the current selection.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                    ShapeTarget.Apply(args, shape =>
                        shape.Outline.Type = corel.cdrOutlineType.cdrNoOutline)));

            registry.Define(
                "set_transparency",
                "Apply a uniform transparency to the fill.",
                Schema.WithTarget(("percent", Schema.Number("Transparency 0 (opaque) to 100 (invisible)."))),
                args =>
                {
                    var percent = (int)ToolArgs.Number(args, "percent");
                    if (percent < 0 || percent > 100)
                        throw new ToolArgumentException("'percent' must be between 0 and 100.");
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                            shape.Transparency.ApplyUniformTransparency(percent)));
                });

            registry.Define(
                "clear_transparency",
                "Remove any transparency from the shapes.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                    ShapeTarget.Apply(args, shape => shape.Transparency.ApplyNoTransparency())));

            registry.Define(
                "get_shape_color",
                "Report the fill and outline of the shapes that match the selector, including the " +
                "colour values (hex, RGB and CMYK) of uniform and fountain fills.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var shapes = ShapeTarget.Resolve(args);
                    var array = new JsonArray();
                    foreach (var shape in shapes)
                    {
                        array.Add(new JsonObject
                        {
                            ["name"] = CorelJson.Safe(() => shape.Name),
                            ["type"] = CorelJson.ShapeTypeName(shape.Type),
                            ["fillType"] = CorelJson.Safe(() => shape.Fill.Type.ToString()),
                            ["fill"] = DescribeFill(shape),
                            ["filled"] = Boolean(() => shape.Fill.Type != corel.cdrFillType.cdrNoFill),
                            ["outlineType"] = CorelJson.Safe(() => shape.Outline.Type.ToString()),
                            ["outlineWidth"] = CorelJson.SafeNumber(() => shape.Outline.Width),
                            ["outline"] = DescribeOutline(shape),
                            ["outlined"] = Boolean(() => shape.Outline.Type != corel.cdrOutlineType.cdrNoOutline),
                            ["transparency"] = CorelJson.Safe(() => shape.Transparency.Type.ToString()),
                            ["transparencyUniform"] = CorelJson.SafeInt(() => shape.Transparency.Uniform),
                            ["transparencyFrozen"] = Boolean(() => shape.Transparency.Frozen),
                            ["transparencyAppliedTo"] =
                                CorelJson.Safe(() => shape.Transparency.AppliedTo.ToString()),
                            ["transparencyMergeMode"] =
                                CorelJson.Safe(() => shape.Transparency.MergeMode.ToString())
                        });
                    }
                    return new JsonObject { ["count"] = array.Count, ["shapes"] = array };
                }));
        }

        /// <summary>
        /// Fill details, with the colours for the fill types that carry them. The flat "fillType"
        /// field above is kept for compatibility; this object is where the values live.
        /// </summary>
        private static JsonObject DescribeFill(corel.Shape shape)
        {
            var json = new JsonObject();
            var type = CorelJson.SafeInt(() => (int)shape.Fill.Type);
            if (type == null) return json;

            if (type == (int)corel.cdrFillType.cdrUniformFill)
            {
                json["color"] = ColorJson(CorelJson.Safe(() => shape.Fill.UniformColor));
            }
            else if (type == (int)corel.cdrFillType.cdrFountainFill)
            {
                json["from"] = ColorJson(CorelJson.Safe(() => shape.Fill.Fountain.StartColor));
                json["to"] = ColorJson(CorelJson.Safe(() => shape.Fill.Fountain.EndColor));
                json["angle"] = CorelJson.SafeNumber(() => shape.Fill.Fountain.Angle);
                json["midpoint"] = CorelJson.SafeInt(() => shape.Fill.Fountain.MidPoint);
            }
            else if (type == (int)corel.cdrFillType.cdrPatternFill)
            {
                json["front"] = ColorJson(CorelJson.Safe(() => shape.Fill.Pattern.FrontColor));
                json["back"] = ColorJson(CorelJson.Safe(() => shape.Fill.Pattern.BackColor));
            }
            else if (type == (int)corel.cdrFillType.cdrTextureFill)
            {
                json["library"] = CorelJson.Safe(() => shape.Fill.Texture.LibraryName);
                json["texture"] = CorelJson.Safe(() => shape.Fill.Texture.TextureName);
            }
            else if (type == (int)corel.cdrFillType.cdrPostscriptFill)
            {
                json["name"] = CorelJson.Safe(() => shape.Fill.PostScript.Name);
            }
            return json;
        }

        /// <summary>Outline details: the stroke colour plus its style.</summary>
        private static JsonObject DescribeOutline(corel.Shape shape)
        {
            var json = new JsonObject();
            if (CorelJson.SafeInt(() => (int)shape.Outline.Type) == null) return json;
            json["color"] = ColorJson(CorelJson.Safe(() => shape.Outline.Color));
            json["style"] = CorelJson.Safe(() => shape.Outline.Style.ToString());
            return json;
        }

        /// <summary>A colour as hex plus its RGB and CMYK components; null when there is none.</summary>
        private static JsonObject ColorJson(corel.Color color)
        {
            if (color == null) return null;
            return new JsonObject
            {
                ["hex"] = CorelJson.Safe(() => color.HexValue),
                ["rgb"] = new JsonArray(
                    CorelJson.SafeNumber(() => color.RGBRed) ?? 0,
                    CorelJson.SafeNumber(() => color.RGBGreen) ?? 0,
                    CorelJson.SafeNumber(() => color.RGBBlue) ?? 0),
                ["cmyk"] = new JsonArray(
                    CorelJson.SafeNumber(() => color.CMYKCyan) ?? 0,
                    CorelJson.SafeNumber(() => color.CMYKMagenta) ?? 0,
                    CorelJson.SafeNumber(() => color.CMYYellow) ?? 0,
                    CorelJson.SafeNumber(() => color.CMYKBlack) ?? 0)
            };
        }

        /// <summary>
        /// A pattern is either a library name or the path of a bitmap pattern. AllowedRoots
        /// applies to the second form; library names pass through untouched.
        /// </summary>
        private static string AllowedPattern(string pattern)
        {
            if (string.IsNullOrEmpty(pattern)) return pattern;
            if (pattern.IndexOf('\\') < 0 && pattern.IndexOf('/') < 0 && pattern.IndexOf(':') < 0)
                return pattern;
            return PathPolicy.EnsureAllowed(pattern, "pattern");
        }

        /// <summary>A VGCore Boolean as a JSON boolean, or null when it cannot be read.</summary>
        private static JsonValue Boolean(Func<bool> getter)
        {
            try { return getter(); } catch { return JsonValue.Null; }
        }

        /// <summary>Read a colour argument by name, falling back to an explicit RGB default.</summary>
        private static corel.Color OptionalColor(JsonObject args, string key, int r, int g, int b)
        {
            var value = args[key];
            if (value == null || value.Type == JsonType.Null)
                return CorelBridge.Application.CreateRGBColor(r, g, b);
            return ShapeTarget.ResolveColor(ShapeTarget.WithColor(args, key));
        }
    }
}
