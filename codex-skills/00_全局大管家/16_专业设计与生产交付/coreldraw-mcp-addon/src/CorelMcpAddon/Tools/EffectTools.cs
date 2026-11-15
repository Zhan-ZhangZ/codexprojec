using System;
using System.Collections.Generic;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Interactive effects: blend, contour, shadow, envelope, extrude, lens, distort and Adjust.</summary>
    public static class EffectTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "blend_shapes",
                "Blend two selected shapes together. Select exactly two shapes; the first one " +
                "receives the blend and the second is the destination.",
                Schema.Object(new JsonObject
                {
                    ["steps"] = Schema.Integer("Number of intermediate shapes. Default 20."),
                    ["blendMode"] = Schema.Str("'steps' (default) or 'spacing'."),
                    ["spacing"] = Schema.Number("Spacing between intermediate shapes."),
                    ["angle"] = Schema.Number("Blend rotation angle in degrees. Default 0."),
                    ["loop"] = Schema.Bool("Loop the blend. Default false."),
                    ["rotateShapes"] = Schema.Bool("Rotate the intermediate shapes. Default false.")
                }),
                args =>
                {
                    var steps = ToolArgs.Int(args, "steps", 20);
                    if (steps < 1) throw new ToolArgumentException("'steps' must be at least 1.");
                    var spacing = ToolArgs.Number(args, "spacing", 0);
                    var angle = ToolArgs.Number(args, "angle", 0);
                    var loop = ToolArgs.Bool(args, "loop", false);
                    var rotate = ToolArgs.Bool(args, "rotateShapes", false);

                    var mode = ToolArgs.String(args, "blendMode", "steps").Trim().ToLowerInvariant();
                    corel.cdrBlendMode blendMode;
                    if (mode == "steps") blendMode = corel.cdrBlendMode.cdrBlendSteps;
                    else if (mode == "spacing") blendMode = corel.cdrBlendMode.cdrBlendSpacing;
                    else throw new ToolArgumentException("'blendMode' must be 'steps' or 'spacing'.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var shapes = Selection(2);
                        shapes[0].CreateBlend(
                            shapes[1], steps, corel.cdrFountainFillBlendType.cdrDirectFountainFillBlend,
                            blendMode, spacing, angle, loop, null, rotate, 0, 0, false);
                        Log.Info("Blended " + shapes.Count + " shapes.");
                        return new JsonObject { ["blended"] = shapes.Count, ["steps"] = steps };
                    });
                });

            registry.Define(
                "contour_shape",
                "Add a contour (offset outline) effect to the selected shapes.",
                Schema.WithTarget(
                    ("direction", Schema.Str("inside (default), outside or toCenter.")),
                    ("offset", Schema.Number("Contour offset in document units. Default 1.")),
                    ("steps", Schema.Integer("Number of contour steps. Default 3."))),
                args =>
                {
                    var offset = ToolArgs.Number(args, "offset", 1);
                    if (offset <= 0) throw new ToolArgumentException("'offset' must be positive.");
                    var steps = ToolArgs.Int(args, "steps", 3);
                    if (steps < 1) throw new ToolArgumentException("'steps' must be at least 1.");

                    var direction = ToolArgs.String(args, "direction", "inside").Trim().ToLowerInvariant();
                    corel.cdrContourDirection directionValue;
                    if (direction == "inside") directionValue = corel.cdrContourDirection.cdrContourInside;
                    else if (direction == "outside") directionValue = corel.cdrContourDirection.cdrContourOutside;
                    else if (direction == "tocenter") directionValue = corel.cdrContourDirection.cdrContourToCenter;
                    else throw new ToolArgumentException("'direction' must be inside, outside or toCenter.");

                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.CreateContour(
                            directionValue, offset, steps,
                            corel.cdrFountainFillBlendType.cdrDirectFountainFillBlend,
                            null, null, null, 0, 0,
                            corel.cdrContourEndCapType.cdrContourButtCap,
                            corel.cdrContourCornerType.cdrContourCornerMiteredBevel, 0)));
                });

            registry.Define(
                "drop_shadow",
                "Add a drop shadow to the selected shapes. 'shadowType' is 'flat' (default), " +
                "'bottom', 'top', 'left' or 'right'.",
                Schema.WithTarget(
                    ("shadowType", Schema.Str("flat (default), bottom, top, left or right.")),
                    ("opacity", Schema.Integer("Shadow opacity 0-100. Default 50.")),
                    ("feather", Schema.Integer("Feather width 0-100. Default 15.")),
                    ("offsetX", Schema.Number("Horizontal offset. Default 2.")),
                    ("offsetY", Schema.Number("Vertical offset. Default -2.")),
                    ("color", Schema.Str("Shadow colour as hex, e.g. \"#000000\".")),
                    ("cmyk", Schema.Str("Shadow colour as \"C,M,Y,K\".")),
                    ("gray", Schema.Number("Shadow grey level 0-100 (0 is black, 100 is white)."))),
                args =>
                {
                    var shadowType = ToolArgs.String(args, "shadowType", "flat").Trim().ToLowerInvariant();
                    corel.cdrDropShadowType type;
                    switch (shadowType)
                    {
                        case "flat": type = corel.cdrDropShadowType.cdrDropShadowFlat; break;
                        case "bottom": type = corel.cdrDropShadowType.cdrDropShadowBottom; break;
                        case "top": type = corel.cdrDropShadowType.cdrDropShadowTop; break;
                        case "left": type = corel.cdrDropShadowType.cdrDropShadowLeft; break;
                        case "right": type = corel.cdrDropShadowType.cdrDropShadowRight; break;
                        default: throw new ToolArgumentException(
                            "'shadowType' must be flat, bottom, top, left or right.");
                    }

                    var opacity = ToolArgs.Int(args, "opacity", 50);
                    if (opacity < 0 || opacity > 100)
                        throw new ToolArgumentException("'opacity' must be between 0 and 100.");
                    var feather = ToolArgs.Int(args, "feather", 15);
                    if (feather < 0 || feather > 100)
                        throw new ToolArgumentException("'feather' must be between 0 and 100.");
                    var offsetX = ToolArgs.Number(args, "offsetX", 2);
                    var offsetY = ToolArgs.Number(args, "offsetY", -2);

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var color = OptionalColor(args);
                        return ShapeTarget.Apply(args, shape => shape.CreateDropShadow(
                            type, opacity, feather, offsetX, offsetY, color,
                            corel.cdrFeatherType.cdrFeatherGaussianBlur,
                            corel.cdrEdgeType.cdrEdgeLinear, 0, 0, 0,
                            corel.cdrMergeMode.cdrMergeNormal));
                    });
                });

            registry.Define(
                "envelope_shape",
                "Apply an envelope effect to the selected shapes. 'mode' is 'horizontal' (default), " +
                "'original', 'putty' or 'vertical'.",
                Schema.WithTarget(
                    ("mode", Schema.Str("horizontal (default), original, putty or vertical.")),
                    ("preset", Schema.Integer("Envelope preset index. Default 1.")),
                    ("keepLines", Schema.Bool("Convert straight lines to curves. Default false."))),
                args =>
                {
                    var mode = ToolArgs.String(args, "mode", "horizontal").Trim().ToLowerInvariant();
                    corel.cdrEnvelopeMode modeValue;
                    switch (mode)
                    {
                        case "horizontal": modeValue = corel.cdrEnvelopeMode.cdrEnvelopeHorizontal; break;
                        case "original": modeValue = corel.cdrEnvelopeMode.cdrEnvelopeOriginal; break;
                        case "putty": modeValue = corel.cdrEnvelopeMode.cdrEnvelopePutty; break;
                        case "vertical": modeValue = corel.cdrEnvelopeMode.cdrEnvelopeVertical; break;
                        default: throw new ToolArgumentException(
                            "'mode' must be horizontal, original, putty or vertical.");
                    }

                    var preset = ToolArgs.Int(args, "preset", 1);
                    var keepLines = ToolArgs.Bool(args, "keepLines", false);
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.CreateEnvelope(preset, modeValue, keepLines)));
                });

            registry.Define(
                "extrude_shape",
                "Extrude the selected shapes. 'extrudeType' is 'smallBack' (default), 'smallFront', " +
                "'bigBack', 'bigFront', 'backParallel' or 'frontParallel'.",
                Schema.WithTarget(
                    ("extrudeType", Schema.Str("smallBack (default), smallFront, bigBack, bigFront, backParallel or frontParallel.")),
                    ("depth", Schema.Number("Extrusion depth in document units. Default 5.")),
                    ("vpX", Schema.Number("Vanishing point X coordinate, in document units.")),
                    ("vpY", Schema.Number("Vanishing point Y coordinate, in document units.")),
                    ("shading", Schema.Str("objectFill (default), solidFill or colorShading.")),
                    ("bevelDepth", Schema.Number("Bevel depth, in document units. Default 0."))),
                args =>
                {
                    var type = ToolArgs.String(args, "extrudeType", "smallBack").Trim().ToLowerInvariant();
                    corel.cdrExtrudeType extrudeType;
                    switch (type)
                    {
                        case "smallback": extrudeType = corel.cdrExtrudeType.cdrExtrudeSmallBack; break;
                        case "smallfront": extrudeType = corel.cdrExtrudeType.cdrExtrudeSmallFront; break;
                        case "bigback": extrudeType = corel.cdrExtrudeType.cdrExtrudeBigBack; break;
                        case "bigfront": extrudeType = corel.cdrExtrudeType.cdrExtrudeBigFront; break;
                        case "backparallel": extrudeType = corel.cdrExtrudeType.cdrExtrudeBackParallel; break;
                        case "frontparallel": extrudeType = corel.cdrExtrudeType.cdrExtrudeFrontParallel; break;
                        default: throw new ToolArgumentException(
                            "'extrudeType' must be smallBack, smallFront, bigBack, bigFront, backParallel or frontParallel.");
                    }

                    var shading = ToolArgs.String(args, "shading", "objectFill").Trim().ToLowerInvariant();
                    corel.cdrExtrudeShading shadingValue;
                    if (shading == "objectfill") shadingValue = corel.cdrExtrudeShading.cdrExtrudeObjectFill;
                    else if (shading == "solidfill") shadingValue = corel.cdrExtrudeShading.cdrExtrudeSolidFill;
                    else if (shading == "colorshading") shadingValue = corel.cdrExtrudeShading.cdrExtrudeColorShading;
                    else throw new ToolArgumentException(
                        "'shading' must be objectFill, solidFill or colorShading.");

                    var depth = ToolArgs.Number(args, "depth", 5);
                    if (depth <= 0) throw new ToolArgumentException("'depth' must be positive.");
                    var vpX = ToolArgs.Number(args, "vpX", 0);
                    var vpY = ToolArgs.Number(args, "vpY", 0);
                    var bevelDepth = ToolArgs.Number(args, "bevelDepth", 0);

                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.CreateExtrude(
                            extrudeType, corel.cdrExtrudeVPType.cdrVPLockedToShape, vpX, vpY, depth,
                            shadingValue, null, null, bevelDepth, 45, null, false)));
                });

            registry.Define(
                "lens_shape",
                "Apply a lens effect to the selected shapes. 'lensType' is 'magnify' (default), " +
                "'fishEye', 'wireframe', 'colorLimit', 'colorAdd', 'invert', 'brighten', " +
                "'tintedGrayscale', 'heatMap', 'transparency' or 'customColorMap'.",
                Schema.WithTarget(
                    ("lensType", Schema.Str("magnify (default), fishEye, wireframe, colorLimit, colorAdd, invert, brighten, tintedGrayscale, heatMap, transparency or customColorMap.")),
                    ("rate", Schema.Number("Magnification (1-100) or effect rate (0-100). Default 1."))),
                args =>
                {
                    var name = ToolArgs.String(args, "lensType", "magnify").Trim().ToLowerInvariant();
                    corel.cdrLensType lensType;
                    switch (name)
                    {
                        case "magnify": lensType = corel.cdrLensType.cdrLensMagnify; break;
                        case "fisheye": lensType = corel.cdrLensType.cdrLensFishEye; break;
                        case "wireframe": lensType = corel.cdrLensType.cdrLensWireframe; break;
                        case "colorlimit": lensType = corel.cdrLensType.cdrLensColorLimit; break;
                        case "coloradd": lensType = corel.cdrLensType.cdrLensColorAdd; break;
                        case "invert": lensType = corel.cdrLensType.cdrLensInvert; break;
                        case "brighten": lensType = corel.cdrLensType.cdrLensBrighten; break;
                        case "tintedgrayscale": lensType = corel.cdrLensType.cdrLensTintedGrayscale; break;
                        case "heatmap": lensType = corel.cdrLensType.cdrLensHeatMap; break;
                        case "transparency": lensType = corel.cdrLensType.cdrLensTransparency; break;
                        case "customcolormap": lensType = corel.cdrLensType.cdrLensCustomColorMap; break;
                        default: throw new ToolArgumentException("Unknown lens type '" + name + "'.");
                    }

                    var rate = ToolArgs.Number(args, "rate", 1);
                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape => shape.CreateLens(
                            lensType, rate, null, null,
                            corel.cdrFountainFillBlendType.cdrDirectFountainFillBlend)));
                });

            registry.Define(
                "distort_shape",
                "Apply a distortion to the selected shapes. 'distortType' is 'pushPull' (default), " +
                "'twister' or 'zipper'.",
                Schema.WithTarget(
                    ("distortType", Schema.Str("pushPull (default), twister or zipper.")),
                    ("originX", Schema.Number("Distortion centre X coordinate, in document units.")),
                    ("originY", Schema.Number("Distortion centre Y coordinate, in document units.")),
                    ("amplitude", Schema.Integer("Push/pull amplitude, or zipper amplitude. Default 20.")),
                    ("angle", Schema.Number("Twister rotation angle in degrees. Default 30.")),
                    ("frequency", Schema.Integer("Zipper frequency. Default 10.")),
                    ("random", Schema.Bool("Zipper: random offsets. Default false.")),
                    ("smooth", Schema.Bool("Zipper: smooth distortion. Default true.")),
                    ("local", Schema.Bool("Zipper: local distortion. Default false."))),
                args =>
                {
                    var name = ToolArgs.String(args, "distortType", "pushPull").Trim().ToLowerInvariant();
                    if (name != "pushpull" && name != "twister" && name != "zipper")
                        throw new ToolArgumentException("'distortType' must be pushPull, twister or zipper.");

                    var originX = ToolArgs.Number(args, "originX", 0);
                    var originY = ToolArgs.Number(args, "originY", 0);
                    var amplitude = ToolArgs.Int(args, "amplitude", 20);
                    var angle = ToolArgs.Number(args, "angle", 30);
                    var frequency = ToolArgs.Int(args, "frequency", 10);
                    var random = ToolArgs.Bool(args, "random", false);
                    var smooth = ToolArgs.Bool(args, "smooth", true);
                    var local = ToolArgs.Bool(args, "local", false);

                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            switch (name)
                            {
                                case "pushpull":
                                    shape.CreatePushPullDistortion(originX, originY, amplitude);
                                    break;
                                case "twister":
                                    shape.CreateTwisterDistortion(originX, originY, angle);
                                    break;
                                default:
                                    shape.CreateZipperDistortion(
                                        originX, originY, amplitude, frequency, random, smooth, local);
                                    break;
                            }
                        }));
                });

            registry.Define(
                "adjust_color",
                "Apply a colour adjustment (menu Effects > Adjust) to the selected shapes.",
                Schema.WithTarget(
                    ("adjustment", Schema.Str("invert, gamma, posterize, colorBalance, bci or hsl.")),
                    ("gamma", Schema.Number("Gamma value for 'gamma'. Default 1.5.")),
                    ("levels", Schema.Integer("Posterize levels 2-32. Default 6.")),
                    ("cyan", Schema.Integer("Color balance cyan/red -100..100.")),
                    ("magenta", Schema.Integer("Color balance magenta/green -100..100.")),
                    ("yellow", Schema.Integer("Color balance yellow/blue -100..100.")),
                    ("shadows", Schema.Bool("Color balance: apply to shadows. Default true.")),
                    ("midtones", Schema.Bool("Color balance: apply to midtones. Default true.")),
                    ("highlights", Schema.Bool("Color balance: apply to highlights. Default true.")),
                    ("preserveLuminosity", Schema.Bool("Color balance: preserve luminosity. Default true.")),
                    ("brightness", Schema.Integer("Brightness/contrast/intensity -100..100.")),
                    ("contrast", Schema.Integer("Contrast adjustment, -100 to 100.")),
                    ("intensity", Schema.Integer("Intensity adjustment, -100 to 100.")),
                    ("hue", Schema.Number("Hue shift in degrees, -180 to 180.")),
                    ("saturation", Schema.Number("Saturation shift -100..100.")),
                    ("lightness", Schema.Number("Lightness shift -100..100."))),
                args =>
                {
                    var adjustment = ToolArgs.String(args, "adjustment").Trim().ToLowerInvariant();
                    switch (adjustment)
                    {
                        case "invert":
                            return CorelBridge.Run<JsonValue>(() =>
                                ShapeTarget.Apply(args, shape => shape.ApplyEffectInvert()));

                        case "gamma":
                        {
                            var gamma = ToolArgs.Number(args, "gamma", 1.5);
                            if (gamma <= 0) throw new ToolArgumentException("'gamma' must be positive.");
                            return CorelBridge.Run<JsonValue>(() =>
                                ShapeTarget.Apply(args, shape => shape.ApplyEffectGamma(gamma)));
                        }

                        case "posterize":
                        {
                            var levels = ToolArgs.Int(args, "levels", 6);
                            if (levels < 2 || levels > 32)
                                throw new ToolArgumentException("'levels' must be between 2 and 32.");
                            return CorelBridge.Run<JsonValue>(() =>
                                ShapeTarget.Apply(args, shape => shape.ApplyEffectPosterize(levels)));
                        }

                        case "colorbalance":
                        {
                            var cyan = Clamp(ToolArgs.Int(args, "cyan", 0), "cyan");
                            var magenta = Clamp(ToolArgs.Int(args, "magenta", 0), "magenta");
                            var yellow = Clamp(ToolArgs.Int(args, "yellow", 0), "yellow");
                            var shadows = ToolArgs.Bool(args, "shadows", true);
                            var midtones = ToolArgs.Bool(args, "midtones", true);
                            var highlights = ToolArgs.Bool(args, "highlights", true);
                            var preserve = ToolArgs.Bool(args, "preserveLuminosity", true);
                            return CorelBridge.Run<JsonValue>(() =>
                                ShapeTarget.Apply(args, shape => shape.ApplyEffectColorBalance(
                                    cyan, magenta, yellow, shadows, midtones, highlights, preserve)));
                        }

                        case "bci":
                        {
                            var brightness = Clamp(ToolArgs.Int(args, "brightness", 0), "brightness");
                            var contrast = Clamp(ToolArgs.Int(args, "contrast", 0), "contrast");
                            var intensity = Clamp(ToolArgs.Int(args, "intensity", 0), "intensity");
                            return CorelBridge.Run<JsonValue>(() =>
                                ShapeTarget.Apply(args, shape =>
                                    shape.ApplyEffectBCI(brightness, contrast, intensity)));
                        }

                        case "hsl":
                        {
                            var hue = ToolArgs.Number(args, "hue", 0);
                            var saturation = ToolArgs.Number(args, "saturation", 0);
                            var lightness = ToolArgs.Number(args, "lightness", 0);
                            if (hue == 0 && saturation == 0 && lightness == 0)
                                throw new ToolArgumentException(
                                    "Give 'hue', 'saturation' and/or 'lightness' for the 'hsl' adjustment.");
                            return CorelBridge.Run<JsonValue>(() =>
                                ShapeTarget.Apply(args, shape =>
                                    shape.ApplyEffectHSL(hue, saturation, lightness)));
                        }

                        default:
                            throw new ToolArgumentException(
                                "'adjustment' must be invert, gamma, posterize, colorBalance, bci or hsl.");
                    }
                });

            registry.Define(
                "clear_effect",
                "Remove an interactive effect from the selected shapes. 'effect' is 'blend', " +
                "'contour', 'distortion', 'dropShadow', 'envelope', 'extrude', 'lens', " +
                "'perspective', 'textOnPath', 'innerShadow', 'custom' or 'all'.",
                Schema.WithTarget(("effect", Schema.Str("Effect to remove: blend, contour, distortion, dropShadow, envelope, extrude, lens, perspective, textOnPath, innerShadow, custom or all."))),
                args =>
                {
                    var name = ToolArgs.String(args, "effect", "all").Trim().ToLowerInvariant();
                    var types = new List<corel.cdrEffectType>();
                    switch (name)
                    {
                        case "blend": types.Add(corel.cdrEffectType.cdrBlend); break;
                        case "contour": types.Add(corel.cdrEffectType.cdrContour); break;
                        case "distortion": types.Add(corel.cdrEffectType.cdrDistortion); break;
                        case "dropshadow": types.Add(corel.cdrEffectType.cdrDropShadow); break;
                        case "envelope": types.Add(corel.cdrEffectType.cdrEnvelope); break;
                        case "extrude": types.Add(corel.cdrEffectType.cdrExtrude); break;
                        case "lens": types.Add(corel.cdrEffectType.cdrLens); break;
                        case "perspective": types.Add(corel.cdrEffectType.cdrPerspective); break;
                        case "textonpath":
                            types.Add(corel.cdrEffectType.cdrTextOnPath);
                            types.Add(corel.cdrEffectType.cdrControlPath);
                            break;
                        case "innershadow": types.Add(corel.cdrEffectType.cdrInnerShadow); break;
                        case "custom": types.Add(corel.cdrEffectType.cdrCustomEffect); break;
                        case "all":
                            types.Add(corel.cdrEffectType.cdrBlend);
                            types.Add(corel.cdrEffectType.cdrContour);
                            types.Add(corel.cdrEffectType.cdrDistortion);
                            types.Add(corel.cdrEffectType.cdrDropShadow);
                            types.Add(corel.cdrEffectType.cdrEnvelope);
                            types.Add(corel.cdrEffectType.cdrExtrude);
                            types.Add(corel.cdrEffectType.cdrLens);
                            types.Add(corel.cdrEffectType.cdrPerspective);
                            types.Add(corel.cdrEffectType.cdrTextOnPath);
                            types.Add(corel.cdrEffectType.cdrControlPath);
                            types.Add(corel.cdrEffectType.cdrInnerShadow);
                            break;
                        default: throw new ToolArgumentException("Unknown effect '" + name + "'.");
                    }

                    return CorelBridge.Run<JsonValue>(() =>
                        ShapeTarget.Apply(args, shape =>
                        {
                            foreach (var type in types)
                            {
                                try { shape.ClearEffect(type); }
                                catch { }
                            }
                        }));
                });

            registry.Define(
                "flatten_effects",
                "Flatten every interactive effect on the selected shapes into plain curves.",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                    ShapeTarget.Apply(args, shape => shape.FlattenEffects())));

            registry.Define(
                "separate_shape",
                "Separate the selected shapes from their effects (the inverse of Apply).",
                Schema.WithTarget(),
                args => CorelBridge.Run<JsonValue>(() =>
                    ShapeTarget.Apply(args, shape => shape.Separate())));
        }

        private static int Clamp(int value, string name)
        {
            if (value < -100 || value > 100)
                throw new ToolArgumentException("'" + name + "' must be between -100 and 100.");
            return value;
        }

        private static corel.Color OptionalColor(JsonObject args)
        {
            if (args.ContainsKey("color") || args.ContainsKey("cmyk") || args.ContainsKey("gray"))
                return ShapeTarget.ResolveColor(args);
            return CorelBridge.Application.CreateRGBColor(0, 0, 0);
        }

        /// <summary>Snapshot exactly <paramref name="count"/> selected shapes, or fail.</summary>
        private static List<corel.Shape> Selection(int count)
        {
            var doc = DocumentTools.RequireActiveDocument();
            var range = doc.SelectionRange;
            var shapes = new List<corel.Shape>();
            if (range != null)
            {
                for (var i = 1; i <= range.Count; i++)
                {
                    corel.Shape shape = null;
                    try { shape = range[i]; } catch { }
                    if (shape != null) shapes.Add(shape);
                }
            }
            if (shapes.Count != count)
                throw new ToolArgumentException("Select exactly " + count + " shapes first.");
            return shapes;
        }
    }
}
