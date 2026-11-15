using CorelMcp.Tools;

namespace CorelMcp
{
    /// <summary>Registers every MCP tool exposed by the add-on.</summary>
    public static class ToolCatalog
    {
        public static ToolRegistry Build()
        {
            var registry = new ToolRegistry();

            // documents, pages and units
            DocumentTools.Register(registry);
            PageTools.Register(registry);

            // drawing
            ShapeTools.Register(registry);
            DrawingExtraTools.Register(registry);
            TextTools.Register(registry);

            // colour, outline and transparency
            ColorTools.Register(registry);

            // editing
            TransformTools.Register(registry);
            NavigationTools.Register(registry);
            SelectTools.Register(registry);
            BooleanTools.Register(registry);
            LayerTools.Register(registry);
            LayoutTools.Register(registry);
            DimensionTools.Register(registry);
            EffectTools.Register(registry);
            ObjectExtraTools.Register(registry);
            ObjectNameTools.Register(registry);

            // output and introspection
            ExportTools.Register(registry);
            ServerTools.Register(registry);

            return registry;
        }
    }
}
