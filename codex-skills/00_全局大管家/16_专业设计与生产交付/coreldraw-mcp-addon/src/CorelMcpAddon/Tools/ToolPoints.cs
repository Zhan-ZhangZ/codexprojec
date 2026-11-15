using System.Collections.Generic;
using System.Globalization;
using CorelMcp.Json;

namespace CorelMcp.Tools
{
    /// <summary>A plain point in document units.</summary>
    public struct ToolPoint
    {
        public double X;
        public double Y;

        public ToolPoint(double x, double y)
        {
            X = x;
            Y = y;
        }
    }

    /// <summary>Parses the "points" argument shared by the drawing, dimension and connector tools.</summary>
    public static class ToolPoints
    {
        /// <summary>
        /// Read a required "points" argument. Each element is either [x, y] or { x, y }.
        /// </summary>
        public static List<ToolPoint> Required(JsonObject args, string name, int minimum)
        {
            var array = args?[name] as JsonArray;
            if (array == null)
                throw new ToolArgumentException("'" + name + "' must be a JSON array of points.");

            var points = new List<ToolPoint>();
            foreach (var element in array) points.Add(One(element, name));

            if (points.Count < minimum)
                throw new ToolArgumentException(
                    "'" + name + "' must contain at least " + minimum + " point(s).");
            return points;
        }

        private static ToolPoint One(JsonValue element, string name)
        {
            var list = element as JsonArray;
            if (list != null)
            {
                if (list.Count < 2)
                    throw new ToolArgumentException("Every point in '" + name + "' needs an x and a y value.");
                return new ToolPoint(Number(list[0]), Number(list[1]));
            }

            var item = element as JsonObject;
            if (item == null || item["x"] == null || item["y"] == null)
                throw new ToolArgumentException(
                    "Every point in '" + name + "' must be [x, y] or { x, y }.");
            return new ToolPoint(Number(item["x"]), Number(item["y"]));
        }

        /// <summary>Read a single point; accepts the same forms as <see cref="Required"/>.</summary>
        public static ToolPoint Single(JsonValue element, string name)
        {
            return One(element, name);
        }

        public static double Number(JsonValue value)
        {
            if (value != null && (value.Type == JsonType.Integer || value.Type == JsonType.Float))
                return value.Value<double>();
            double parsed;
            if (value != null && double.TryParse(value.AsString(), NumberStyles.Any,
                    CultureInfo.InvariantCulture, out parsed))
                return parsed;
            throw new ToolArgumentException("A point coordinate is not a number.");
        }
    }
}
