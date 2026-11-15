using System;
using CorelMcp.Json;
using CorelMcp.Config;
using CorelMcp.Corel;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Document lifecycle tools.</summary>
    public static class DocumentTools
    {
        public static void Register(ToolRegistry registry)
        {
            registry.Define(
                "create_document",
                "Create a new CorelDRAW document. Sets the document unit (default mm) and returns document info.",
                Schema.Object(new JsonObject
                {
                    ["unit"] = Schema.Str("Document unit: mm, cm, inch, px. Default mm.")
                }),
                args =>
                {
                    var unit = ToolArgs.String(args, "unit", "mm");
                    return CorelBridge.Run(() =>
                    {
                        var app = CorelBridge.Application;
                        var doc = app.CreateDocument();
                        doc.Unit = ParseUnit(unit);
                        var info = CorelJson.DocumentToJson(doc, true);
                        Log.Info("Created document '" + info["name"] + "' (" + unit + ").");
                        return info;
                    });
                });

            registry.Define(
                "open_document",
                "Open an existing .cdr file and return its info. CorelDRAW does not keep the " +
                "document unit in the file when it was set programmatically — the document " +
                "reopens in inches — so pass 'unit' to set it again after opening.",
                Schema.Required(("path", Schema.Str("Absolute path to the .cdr file.")))
                    .WithOptional(("unit", Schema.Str("Unit to apply after opening: mm, cm, inch, px."))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    var unit = ToolArgs.String(args, "unit", null);
                    return CorelBridge.Run(() =>
                    {
                        var doc = CorelBridge.Application.OpenDocument(path, 0);
                        if (!string.IsNullOrEmpty(unit)) doc.Unit = ParseUnit(unit);
                        var info = CorelJson.DocumentToJson(doc, true);
                        Log.Info("Opened document '" + path + "'.");
                        return info;
                    });
                });

            registry.Define(
                "save_document",
                "Save the active document to its current file name.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var doc = RequireActiveDocument();
                    doc.Save();
                    Log.Info("Saved document '" + doc.Name + "'.");
                    return new JsonObject { ["saved"] = true, ["fileName"] = doc.FileName };
                }));

            registry.Define(
                "save_document_as",
                "Save the active document under a new path, leaving the original file untouched. The document stays open.",
                Schema.Required(("path", Schema.Str("Destination file path, e.g. C:\\out\\drawing.cdr"))),
                args =>
                {
                    var path = PathPolicy.EnsureAllowed(ToolArgs.String(args, "path"), "path");
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var doc = RequireActiveDocument();
                        doc.SaveAs(path, null);
                        Log.Info("Saved document as '" + path + "'.");
                        return new JsonObject { ["saved"] = true, ["fileName"] = doc.FileName };
                    });
                });

            registry.Define(
                "close_document",
                "Close the active document, optionally saving first.",
                Schema.Object(new JsonObject { ["save"] = Schema.Bool("Save before closing. Default false.") }),
                args =>
                {
                    var save = ToolArgs.Bool(args, "save", false);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var doc = RequireActiveDocument();
                        var name = doc.Name;
                        if (save) doc.Save();
                        doc.Close();
                        Log.Info("Closed document '" + name + "'.");
                        return new JsonObject { ["closed"] = true, ["name"] = name };
                    });
                });

            registry.Define(
                "list_documents",
                "List the documents open in CorelDRAW, with their paths, page counts and which one is active.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var app = CorelBridge.Application;
                    var active = app.ActiveDocument;
                    var array = new JsonArray();
                    int count = app.Documents.Count;
                    for (int i = 1; i <= count; i++)
                    {
                        var doc = app.Documents[i];
                        bool isActive = active != null && doc == active;
                        array.Add(CorelJson.DocumentToJson(doc, isActive));
                    }
                    return new JsonObject { ["count"] = count, ["documents"] = array };
                }));

            registry.Define(
                "get_document_info",
                "Get info about the active document (name, path, unit, page count).",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var doc = RequireActiveDocument();
                    return CorelJson.DocumentToJson(doc, true);
                }));

            registry.Define(
                "add_page",
                "Append one or more pages to the active document.",
                Schema.Object(new JsonObject { ["count"] = Schema.Integer("Number of pages to add. Default 1.") }),
                args =>
                {
                    var count = ToolArgs.Int(args, "count", 1);
                    return CorelBridge.Run<JsonValue>(() =>
                    {
                        var doc = RequireActiveDocument();
                        doc.AddPages(count);
                        Log.Info("Added " + count + " page(s).");
                        return new JsonObject { ["added"] = count, ["pages"] = doc.Pages.Count };
                    });
                });

            registry.Define(
                "get_pages",
                "List the pages of the active document: 1-based index, name, width and height in document units, and which page is active.",
                Schema.Object(new JsonObject()),
                args => CorelBridge.Run<JsonValue>(() =>
                {
                    var doc = RequireActiveDocument();
                    var array = new JsonArray();
                    int count = doc.Pages.Count;
                    for (int i = 1; i <= count; i++) array.Add(CorelJson.PageToJson(doc.Pages[i]));
                    return new JsonObject { ["count"] = count, ["pages"] = array };
                }));
        }

        internal static corel.Document RequireActiveDocument()
        {
            var doc = CorelBridge.Application.ActiveDocument;
            if (doc == null)
                throw new InvalidOperationException("There is no active document. Use create_document or open_document first.");
            return doc;
        }

        internal static corel.cdrUnit ParseUnit(string unit)
        {
            switch ((unit ?? "mm").Trim().ToLowerInvariant())
            {
                case "mm":
                case "millimeter":
                case "millimeters": return corel.cdrUnit.cdrMillimeter;
                case "cm":
                case "centimeter":
                case "centimeters": return corel.cdrUnit.cdrCentimeter;
                case "in":
                case "inch":
                case "inches": return corel.cdrUnit.cdrInch;
                case "px":
                case "pixel":
                case "pixels": return corel.cdrUnit.cdrPixel;
                case "pt":
                case "point":
                case "points": return corel.cdrUnit.cdrPoint;
                default:
                    throw new ToolArgumentException("Unknown unit '" + unit + "'. Use mm, cm, inch, px or pt.");
            }
        }
    }
}
