using System;
using System.Collections.Generic;
using CorelMcp.Json;
using corel = Corel.Interop.VGCore;

namespace CorelMcp.Tools
{
    /// <summary>Conversion helpers between VGCore objects and JSON.</summary>
    public static class CorelJson
    {
        public static string ShapeTypeName(corel.cdrShapeType type)
        {
            switch (type)
            {
                case corel.cdrShapeType.cdrRectangleShape: return "rectangle";
                case corel.cdrShapeType.cdrEllipseShape: return "ellipse";
                case corel.cdrShapeType.cdrCurveShape: return "curve";
                case corel.cdrShapeType.cdrPolygonShape: return "polygon";
                case corel.cdrShapeType.cdrBitmapShape: return "bitmap";
                case corel.cdrShapeType.cdrTextShape: return "text";
                case corel.cdrShapeType.cdrGroupShape: return "group";
                case corel.cdrShapeType.cdrSelectionShape: return "selection";
                case corel.cdrShapeType.cdrGuidelineShape: return "guideline";
                case corel.cdrShapeType.cdrBlendGroupShape: return "blend";
                case corel.cdrShapeType.cdrExtrudeGroupShape: return "extrude";
                default: return type.ToString();
            }
        }

        public static JsonObject ShapeToJson(corel.Shape shape, int index)
        {
            var json = new JsonObject
            {
                ["index"] = index,
                ["type"] = ShapeTypeName(shape.Type),
                ["name"] = Safe(() => shape.Name),
                ["positionX"] = SafeNumber(() => shape.PositionX),
                ["positionY"] = SafeNumber(() => shape.PositionY),
                ["width"] = SafeNumber(() => shape.SizeWidth),
                ["height"] = SafeNumber(() => shape.SizeHeight)
            };

            if (shape.Type == corel.cdrShapeType.cdrTextShape)
            {
                var text = Safe(() => shape.Text?.Story?.Text);
                if (text != null) json["text"] = text;
            }
            return json;
        }

        public static JsonObject DocumentToJson(corel.Document document, bool makeActive)
        {
            if (document == null) return null;
            return new JsonObject
            {
                ["name"] = Safe(() => document.Name),
                ["fileName"] = Safe(() => document.FileName),
                ["active"] = makeActive,
                ["unit"] = Safe(() => document.Unit.ToString()),
                ["pages"] = SafeNumber(() => document.Pages.Count),
                ["referencePoint"] = Safe(() => document.ReferencePoint.ToString()),
                ["origin"] = "page bottom-left corner, Y up (the document reference point does not affect tool coordinates)"
            };
        }

        public static JsonObject PageToJson(corel.Page page)
        {
            return new JsonObject
            {
                ["index"] = SafeNumber(() => page.Index),
                ["name"] = Safe(() => page.Name),
                ["width"] = SafeNumber(() => page.SizeWidth),
                ["height"] = SafeNumber(() => page.SizeHeight)
            };
        }

        /// <summary>Enumerate the shapes of a collection into a JSON array.</summary>
        public static JsonArray ShapesToJson(corel.Shapes shapes)
        {
            var array = new JsonArray();
            if (shapes == null) return array;
            int count = shapes.Count;
            for (int i = 1; i <= count; i++)
            {
                corel.Shape shape = null;
                try { shape = shapes[i]; } catch { }
                if (shape != null) array.Add(ShapeToJson(shape, i));
            }
            return array;
        }

        public static T Safe<T>(Func<T> getter) where T : class
        {
            try { return getter(); } catch { return null; }
        }

        public static double? SafeNumber(Func<double> getter)
        {
            try { return getter(); } catch { return null; }
        }

        public static int? SafeInt(Func<int> getter)
        {
            try { return getter(); } catch { return null; }
        }

        /// <summary>
        /// 1-based index of a shape on a layer, or -1 when it cannot be found.
        ///
        /// A freshly created shape does not necessarily land at the end of the layer's
        /// Shapes collection, so the index is looked up through the stable StaticID
        /// instead of assuming a position.
        /// </summary>
        public static int IndexOn(corel.Layer layer, corel.Shape shape)
        {
            if (layer == null || shape == null) return -1;

            var id = SafeInt(() => shape.StaticID);
            if (id == null) return -1;

            int count = layer.Shapes.Count;
            for (int i = 1; i <= count; i++)
            {
                corel.Shape candidate = null;
                try { candidate = layer.Shapes[i]; } catch { }
                if (candidate == null) continue;
                if (SafeInt(() => candidate.StaticID) == id) return i;
            }
            return -1;
        }

        /// <summary>Find a shape on a layer by 1-based index or by name.</summary>
        public static corel.Shape FindShape(corel.Layer layer, int index, string name)
        {
            if (layer == null) return null;
            if (index > 0) return layer.Shapes[index];
            if (string.IsNullOrEmpty(name)) return null;
            int count = layer.Shapes.Count;
            for (int i = 1; i <= count; i++)
            {
                var candidate = layer.Shapes[i];
                if (candidate != null && string.Equals(candidate.Name, name, StringComparison.Ordinal))
                    return candidate;
            }
            return null;
        }
    }
}
