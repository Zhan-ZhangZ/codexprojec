using System;
using System.Collections.Generic;

namespace CorelMcp.Tools
{
    /// <summary>
    /// Pure geometry for the drawing tools. Deliberately free of any VGCore type so that the
    /// maths — which is where the curve and star defects lived — is unit-testable.
    /// </summary>
    public static class CurveGeometry
    {
        /// <summary>
        /// A Catmull-Rom tangent at <paramref name="index"/>: one sixth of the vector between the
        /// neighbouring nodes, so that a cubic with these handles runs smoothly through the node.
        /// Out-of-range neighbours are mirrored through the end node on an open path, and wrap
        /// around on a closed one.
        /// </summary>
        private static ToolPoint Tangent(IReadOnlyList<ToolPoint> points, int index, bool closed)
        {
            var before = Before(points, index, closed);
            var after = After(points, index, closed);
            return new ToolPoint((after.X - before.X) / 6.0, (after.Y - before.Y) / 6.0);
        }

        private static ToolPoint Before(IReadOnlyList<ToolPoint> points, int index, bool closed)
        {
            if (index > 0) return points[index - 1];
            if (closed) return points[points.Count - 1];
            return new ToolPoint(
                2 * points[0].X - points[1].X,
                2 * points[0].Y - points[1].Y);
        }

        private static ToolPoint After(IReadOnlyList<ToolPoint> points, int index, bool closed)
        {
            if (index < points.Count - 1) return points[index + 1];
            if (closed) return points[0];
            var last = points.Count - 1;
            return new ToolPoint(
                2 * points[last].X - points[last - 1].X,
                2 * points[last].Y - points[last - 1].Y);
        }

        /// <summary>The handle leaving a node, i.e. the starting control point of the next segment.</summary>
        public static ToolPoint Outgoing(IReadOnlyList<ToolPoint> points, int index, bool closed)
        {
            var tangent = Tangent(points, index, closed);
            return new ToolPoint(points[index].X + tangent.X, points[index].Y + tangent.Y);
        }

        /// <summary>The handle arriving at a node, i.e. the ending control point of the previous segment.</summary>
        public static ToolPoint Incoming(IReadOnlyList<ToolPoint> points, int index, bool closed)
        {
            var tangent = Tangent(points, index, closed);
            return new ToolPoint(points[index].X - tangent.X, points[index].Y - tangent.Y);
        }

        /// <summary>
        /// The outline of a star with <paramref name="points"/> rays: 2 * points vertices
        /// alternating between the outer radius and <paramref name="innerRatio"/> of it, the first
        /// ray pointing straight up. The y axis grows upwards in the object model.
        /// </summary>
        public static List<ToolPoint> Star(double cx, double cy, double radius, int points, double innerRatio)
        {
            if (points < 3) throw new ArgumentException("'points' must be at least 3.", "points");
            if (radius <= 0) throw new ArgumentException("'radius' must be positive.", "radius");
            if (innerRatio <= 0 || innerRatio >= 1)
                throw new ArgumentException("'innerRatio' must be between 0 and 1 (exclusive).", "innerRatio");

            var vertices = new List<ToolPoint>(points * 2);
            var step = Math.PI / points;
            for (var k = 0; k < points * 2; k++)
            {
                var r = k % 2 == 0 ? radius : radius * innerRatio;
                var angle = Math.PI / 2 + k * step;
                vertices.Add(new ToolPoint(cx + r * Math.Cos(angle), cy + r * Math.Sin(angle)));
            }
            return vertices;
        }
    }
}
