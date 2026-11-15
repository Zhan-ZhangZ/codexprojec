using System;
using CorelMcp.Json;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Layer management.</summary>
    public static class LayerTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "create_layer",
                "Add a new layer to the active page, above the existing ones.",
                Schema.Required(("name", Schema.Str("Layer name as shown in the Object manager."))),
                args =>
                {
                    var name = ToolArgs.String(args, "name");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var page = DocumentTools.RequireActiveDocument().ActivePage;
                        if (page == null) throw new InvalidOperationException("No active page.");
                        var layer = page.CreateLayer(name);
                        return new JsonObject { ["created"] = true, ["name"] = layer.Name };
                    });
                });

            registry.Define(
                "list_layers",
                "List the layers of the active page in stacking order, with their names, visibility and editability.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var doc = DocumentTools.RequireActiveDocument();
                    var page = doc.ActivePage;
                    var activeName = doc.ActiveLayer == null ? null : CorelJson.Safe(() => doc.ActiveLayer.Name);

                    var array = new JsonArray();
                    var layers = page.Layers;
                    for (var i = 1; i <= layers.Count; i++)
                    {
                        var layer = layers[i];
                        array.Add(new JsonObject
                        {
                            ["index"] = i,
                            ["name"] = CorelJson.Safe(() => layer.Name),
                            ["visible"] = CorelJson.SafeInt(() => layer.Visible ? 1 : 0) == 1,
                            ["editable"] = CorelJson.SafeInt(() => layer.Editable ? 1 : 0) == 1,
                            ["printable"] = CorelJson.SafeInt(() => layer.Printable ? 1 : 0) == 1,
                            ["active"] = activeName != null &&
                                         string.Equals(CorelJson.Safe(() => layer.Name), activeName, StringComparison.Ordinal)
                        });
                    }
                    return new JsonObject { ["count"] = array.Count, ["layers"] = array };
                }));

            registry.Define(
                "set_layer",
                "Change layer properties: visibility, editability (lock), printability or name.",
                Schema.Required(("name", Schema.Str("Name of the layer to update.")))
                    .WithOptional(
                        ("visible", Schema.Bool("True shows the layer, false hides it.")),
                        ("editable", Schema.Bool("True locks the layer against editing.")),
                        ("printable", Schema.Bool("Include the layer when printing.")),
                        ("rename", Schema.Str("Name for the new layer."))),
                args =>
                {
                    var name = ToolArgs.String(args, "name");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = FindLayer(name);
                        if (args.ContainsKey("visible")) layer.Visible = ToolArgs.Bool(args, "visible", true);
                        if (args.ContainsKey("editable")) layer.Editable = ToolArgs.Bool(args, "editable", true);
                        if (args.ContainsKey("printable")) layer.Printable = ToolArgs.Bool(args, "printable", true);

                        var renamed = ToolArgs.String(args, "rename", null);
                        if (!string.IsNullOrEmpty(renamed)) layer.Name = renamed;

                        return new JsonObject { ["name"] = CorelJson.Safe(() => layer.Name) };
                    });
                });

            registry.Define(
                "set_active_layer",
                "Make a layer the active one, so new shapes are created on it.",
                Schema.Required(("name", Schema.Str("Layer name as shown in the Object manager."))),
                args =>
                {
                    var name = ToolArgs.String(args, "name");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = FindLayer(name);
                        layer.Activate();
                        return new JsonObject { ["active"] = CorelJson.Safe(() => layer.Name) };
                    });
                });

            registry.Define(
                "move_shapes_to_layer",
                "Move the selected (or matched) shapes onto another layer.",
                Schema.WithTarget(("layer", Schema.Str("Layer the shapes are moved to."))),
                args =>
                {
                    var layerName = ToolArgs.String(args, "layer");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var target = FindLayer(layerName);
                        var shapes = ShapeTarget.Resolve(args);
                        foreach (var shape in shapes) shape.MoveToLayer(target);
                        return new JsonObject { ["moved"] = shapes.Count, ["layer"] = CorelJson.Safe(() => target.Name) };
                    });
                });

            registry.Define(
                "delete_layer",
                "Delete a layer of the active page together with every shape on it. CorelDRAW refuses to delete the last remaining layer.",
                Schema.Required(("name", Schema.Str("Layer name as shown in the Object manager."))),
                args =>
                {
                    var name = ToolArgs.String(args, "name");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var layer = FindLayer(name);
                        var deleted = CorelJson.Safe(() => layer.Name);
                        layer.Delete();
                        return new JsonObject { ["deleted"] = deleted };
                    });
                });
        }

        internal static corel.Layer FindLayer(string name)
        {
            var page = DocumentTools.RequireActiveDocument().ActivePage;
            if (page == null) throw new InvalidOperationException("No active page.");

            var layer = page.Layers.Find(name);
            if (layer == null) layer = FindLayerByName(page, name);
            if (layer == null) throw new ToolArgumentException("No layer named '" + name + "' on the active page.");
            return layer;
        }

        /// <summary>
        /// Name lookup over the layer list. CorelDRAW's own <c>Layers.Find</c> misses the
        /// guides layer — it sits at index 0 — even though <c>list_layers</c> reports it,
        /// which makes it unaddressable by name without this fallback.
        /// </summary>
        private static corel.Layer FindLayerByName(corel.Page page, string name)
        {
            var layers = page.Layers;
            for (var i = 1; i <= layers.Count; i++)
            {
                corel.Layer candidate = null;
                try { candidate = layers[i]; } catch { }
                if (candidate == null) continue;
                if (string.Equals(CorelJson.Safe(() => candidate.Name), name, StringComparison.OrdinalIgnoreCase))
                    return candidate;
            }
            return null;
        }
    }

    /// <summary>Document unit and page setup.</summary>
    public static class PageTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "set_document_unit",
                "Change the unit used for every coordinate and size in this document.",
                Schema.Required(("unit", Schema.Str("mm, cm, m, inch, foot, point, pica or pixel."))),
                args =>
                {
                    var unit = ToolArgs.String(args, "unit");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var doc = DocumentTools.RequireActiveDocument();
                        doc.Unit = DocumentTools.ParseUnit(unit);
                        return new JsonObject { ["unit"] = doc.Unit.ToString(), ["requested"] = unit };
                    });
                });

            registry.Define(
                "set_page_size",
                "Resize the active page, in the document unit.",
                Schema.Required(
                    ("width", Schema.Number("Page width, in document units.")),
                    ("height", Schema.Number("Page height, in document units."))),
                args =>
                {
                    var w = ToolArgs.Number(args, "width");
                    var h = ToolArgs.Number(args, "height");
                    if (w <= 0 || h <= 0) throw new ToolArgumentException("Page size must be positive.");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var page = DocumentTools.RequireActiveDocument().ActivePage;
                        if (page == null) throw new InvalidOperationException("No active page.");
                        page.SetSize(w, h);
                        return new JsonObject
                        {
                            ["width"] = page.SizeWidth,
                            ["height"] = page.SizeHeight,
                            ["orientation"] = CorelJson.Safe(() => page.Orientation.ToString())
                        };
                    });
                });

            registry.Define(
                "set_page_orientation",
                "Switch the active page between portrait and landscape.",
                Schema.Required(("orientation", Schema.Str("'portrait' or 'landscape'."))),
                args =>
                {
                    var value = ToolArgs.String(args, "orientation").ToLowerInvariant();
                    corel.cdrPageOrientation orientation;
                    if (value == "portrait") orientation = corel.cdrPageOrientation.cdrPortrait;
                    else if (value == "landscape") orientation = corel.cdrPageOrientation.cdrLandscape;
                    else throw new ToolArgumentException("'orientation' must be portrait or landscape.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var page = DocumentTools.RequireActiveDocument().ActivePage;
                        if (page == null) throw new InvalidOperationException("No active page.");
                        page.Orientation = orientation;
                        return new JsonObject
                        {
                            ["width"] = page.SizeWidth,
                            ["height"] = page.SizeHeight,
                            ["orientation"] = CorelJson.Safe(() => page.Orientation.ToString())
                        };
                    });
                });

            registry.Define(
                "set_active_page",
                "Make one of the document's pages the active one, so that every page-scoped tool " +
                "(layers, guides, shape selectors and export range 'page') works on it. Give either " +
                "'index' (1-based) or 'name'.",
                Schema.Object(new JsonObject
                {
                    ["index"] = Schema.Integer("1-based page index, in document order."),
                    ["name"] = Schema.Str("Page name (used when index is omitted).")
                }),
                args =>
                {
                    var index = ToolArgs.Int(args, "index", 0);
                    var name = ToolArgs.String(args, "name", null);
                    if (index <= 0 && string.IsNullOrEmpty(name))
                        throw new ToolArgumentException("Give either 'index' or 'name'.");

                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var document = DocumentTools.RequireActiveDocument();
                        corel.Page page = null;
                        if (index > 0)
                        {
                            if (index > document.Pages.Count)
                                throw new ToolArgumentException("'index' is beyond the last page (" +
                                                                 document.Pages.Count + ").");
                            page = document.Pages[index];
                        }
                        else
                        {
                            for (var i = 1; i <= document.Pages.Count; i++)
                            {
                                var candidate = document.Pages[i];
                                if (candidate != null &&
                                    string.Equals(candidate.Name, name, StringComparison.Ordinal))
                                {
                                    page = candidate;
                                    break;
                                }
                            }
                            if (page == null)
                                throw new ToolArgumentException("No page named '" + name + "'.");
                        }

                        page.Activate();
                        return CorelJson.PageToJson(page);
                    });
                });
        }
    }
}
