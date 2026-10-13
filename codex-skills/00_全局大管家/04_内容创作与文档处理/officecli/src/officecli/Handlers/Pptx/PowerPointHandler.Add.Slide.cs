// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Presentation;
using OfficeCli.Core;

namespace OfficeCli.Handlers;

public partial class PowerPointHandler
{
    private string AddSlide(string parentPath, int? index, Dictionary<string, string> properties)
    {
                properties ??= new Dictionary<string, string>();
                // A slide can only attach to the presentation root. Earlier
                // releases silently fell back to "/" when the caller passed
                // a non-root parent (e.g. `/slide[1]`, `/section[2]`,
                // `/bogus`), which masked path typos and produced a slide
                // somewhere other than where the caller expected.
                if (!string.IsNullOrEmpty(parentPath)
                    && parentPath != "/"
                    && parentPath != "")
                {
                    throw new ArgumentException(
                        $"Invalid parent '{parentPath}' for --type slide: a slide can only be added at '/' " +
                        "(slides hang off the presentation root, not under another element).");
                }
                var presentationPart = _doc.PresentationPart
                    ?? throw new InvalidOperationException("Presentation not found");
                var presentation = presentationPart.Presentation
                    ?? throw new InvalidOperationException("No presentation");
                var slideIdList = presentation.GetFirstChild<SlideIdList>()
                    ?? presentation.AppendChild(new SlideIdList());

                var newSlidePart = presentationPart.AddNewPart<SlidePart>();

                // Link slide to slideLayout (required by PowerPoint)
                var slideLayoutPart = ResolveSlideLayout(
                    presentationPart, properties.GetValueOrDefault("layout"));
                if (slideLayoutPart != null)
                    newSlidePart.AddPart(slideLayoutPart);

                newSlidePart.Slide = new Slide(
                    new CommonSlideData(
                        new ShapeTree(
                            new NonVisualGroupShapeProperties(
                                new NonVisualDrawingProperties { Id = 1, Name = "" },
                                new NonVisualGroupShapeDrawingProperties(),
                                new ApplicationNonVisualDrawingProperties()),
                            new GroupShapeProperties()
                        )
                    )
                );

                // Add title shape if text provided (ID starts at 2 since ShapeTree group uses ID=1)
                uint nextShapeId = 2;
                if (properties.TryGetValue("title", out var titleText))
                {
                    XmlTextValidator.ValidateOrThrow(titleText, "title");
                    var titleShape = CreateTextShape(nextShapeId++, "Title", titleText, true);
                    FitAddedTextShapeToLayout(titleShape, slideLayoutPart, isTitle: true);
                    newSlidePart.Slide.CommonSlideData!.ShapeTree!.AppendChild(titleShape);
                }

                // Add content text if provided
                if (properties.TryGetValue("text", out var contentText))
                {
                    XmlTextValidator.ValidateOrThrow(contentText, "text", allowSoftBreakChar: true);
                    // Symmetry with the title path above: title carries
                    // <p:ph type="title"/>, so content carries
                    // <p:ph type="body" idx="1"/> — both bind to layout
                    // slots and Get reports them as placeholder-flavored
                    // (title → type=title; content → type=placeholder +
                    // phType=body) instead of mismatched title vs bare textbox.
                    var textShape = CreateTextShape(nextShapeId++, "Content", contentText, false, isTextBox: true,
                        placeholderType: PlaceholderValues.Body, placeholderIndex: 1);
                    FitAddedTextShapeToLayout(textShape, slideLayoutPart, isTitle: false);
                    newSlidePart.Slide.CommonSlideData!.ShapeTree!.AppendChild(textShape);
                }

                // Apply background if provided
                if (properties.TryGetValue("background", out var bgValue))
                    ApplySlideBackground(newSlidePart, bgValue);

                // bt-3: theme-styled background via <p:bgRef idx="N">[<a:srgbClr/schemeClr>].
                // NodeBuilder emits background.ref (1001..1004 / 1025..1028) and the
                // optional background.refColor (schemeClr name or srgbClr hex). Without
                // this branch the keys round-tripped only through the raw-set <p:bg>
                // passthrough; AddSlide silently ignored them. Apply directly here so
                // the typed Format keys round-trip and the raw-set becomes a no-op
                // when the typed form covers the source.
                if (properties.TryGetValue("background.ref", out var bgRefIdxStr)
                    && uint.TryParse(bgRefIdxStr?.Trim(), System.Globalization.NumberStyles.Integer,
                        System.Globalization.CultureInfo.InvariantCulture, out var bgRefIdx))
                {
                    ApplySlideBackgroundRef(newSlidePart, bgRefIdx,
                        properties.GetValueOrDefault("background.refColor")
                        ?? properties.GetValueOrDefault("background.refcolor"));
                }

                // Apply transition if provided
                if (properties.TryGetValue("transition", out var transValue))
                {
                    ApplyTransition(newSlidePart, transValue);
                    if (transValue.StartsWith("morph", StringComparison.OrdinalIgnoreCase))
                        AutoPrefixMorphNames(newSlidePart);
                }
                if (properties.TryGetValue("advancetime", out var advTime) || properties.TryGetValue("advanceTime", out advTime))
                    SetAdvanceTime(newSlidePart.Slide, advTime);
                if (properties.TryGetValue("advanceclick", out var advClick) || properties.TryGetValue("advanceClick", out advClick))
                    SetAdvanceClick(newSlidePart.Slide, IsTruthy(advClick));
                if (properties.TryGetValue("hidden", out var hiddenVal) && IsTruthy(hiddenVal))
                    newSlidePart.Slide.Show = false;
                // cSld@name — same target as Set's slide-level "name" case.
                if (properties.TryGetValue("name", out var slideName) && !string.IsNullOrEmpty(slideName))
                {
                    XmlTextValidator.ValidateOrThrow(slideName, "name");
                    var csd = newSlidePart.Slide.CommonSlideData;
                    if (csd != null) csd.Name = slideName;
                }

                newSlidePart.Slide.Save();

                var maxId = slideIdList.Elements<SlideId>().Any()
                    ? slideIdList.Elements<SlideId>().Max(s => s.Id?.Value ?? 255) + 1
                    : 256;
                var relId = presentationPart.GetIdOfPart(newSlidePart);

                if (index.HasValue && index.Value < slideIdList.Elements<SlideId>().Count())
                {
                    var refSlide = slideIdList.Elements<SlideId>().ElementAtOrDefault(index.Value);
                    if (refSlide != null)
                        slideIdList.InsertBefore(new SlideId { Id = maxId, RelationshipId = relId }, refSlide);
                    else
                        slideIdList.AppendChild(new SlideId { Id = maxId, RelationshipId = relId });
                }
                else
                {
                    slideIdList.AppendChild(new SlideId { Id = maxId, RelationshipId = relId });
                }

                presentation.Save();
                // Find the actual position of the inserted slide
                var slideIds = slideIdList.Elements<SlideId>().ToList();
                var insertedIdx = slideIds.FindIndex(s => s.RelationshipId?.Value == relId) + 1;
                return $"/slide[{insertedIdx}]";
    }



    /// <summary>
    /// The title/text shapes that <c>add --type slide</c> emits start with the
    /// fixed geometry of a 13.33in × 7.5in slide. Bind them to the slide's
    /// real environment: when the layout (or its master) defines a matching
    /// placeholder — title family for the title, body/subtitle/object family
    /// for the text — adopt that placeholder's type, idx and frame, exactly
    /// as PowerPoint fills a layout slot; otherwise scale the default frame
    /// to the slide size so it never runs past the edge on a 4:3 or 10in deck.
    /// </summary>
    private void FitAddedTextShapeToLayout(Shape shape, SlideLayoutPart? layoutPart, bool isTitle)
    {
        var ph = shape.NonVisualShapeProperties?.ApplicationNonVisualDrawingProperties
            ?.GetFirstChild<PlaceholderShape>();
        var xfrm = shape.ShapeProperties?.Transform2D;
        if (xfrm?.Offset == null || xfrm.Extents == null) return;
        var (slideW, slideH) = GetSlideSize();

        var layoutPh = FindPlaceholderByFamily(layoutPart?.SlideLayout?.CommonSlideData?.ShapeTree, isTitle);
        if (layoutPh != null)
        {
            var lph = layoutPh.NonVisualShapeProperties!.ApplicationNonVisualDrawingProperties!
                .GetFirstChild<PlaceholderShape>()!;
            if (ph != null)
            {
                if (lph.Type?.HasValue == true) ph.Type = lph.Type.Value;
                if (lph.Index?.HasValue == true) ph.Index = lph.Index.Value;
                else ph.Index = null;
            }
            var frame = layoutPh.ShapeProperties?.Transform2D;
            if (frame?.Offset == null || frame.Extents == null)
            {
                // Layout inherits the frame from the master's placeholder of the same family.
                var masterPh = FindPlaceholderByFamily(
                    layoutPart?.SlideMasterPart?.SlideMaster?.CommonSlideData?.ShapeTree, isTitle);
                frame = masterPh?.ShapeProperties?.Transform2D;
            }
            // A layout slot that itself runs past the slide (a deck whose
            // slideSize was changed without rescaling its layouts) is no
            // better than the fixed default — fall through to scaling then.
            if (frame?.Offset != null && frame.Extents != null
                && frame.Offset.X!.Value + frame.Extents.Cx!.Value <= slideW
                && frame.Offset.Y!.Value + frame.Extents.Cy!.Value <= slideH)
            {
                xfrm.Offset!.X = frame.Offset.X;
                xfrm.Offset.Y = frame.Offset.Y;
                xfrm.Extents!.Cx = frame.Extents.Cx;
                xfrm.Extents.Cy = frame.Extents.Cy;
                return;
            }
        }

        if (slideW == SlideSizeDefaults.Widescreen16x9Cx && slideH == SlideSizeDefaults.Widescreen16x9Cy) return;
        var sx = slideW / (double)SlideSizeDefaults.Widescreen16x9Cx;
        var sy = slideH / (double)SlideSizeDefaults.Widescreen16x9Cy;
        // Keep the result pt-exact (multiples of 12700 EMU) so Get reads back
        // unit-qualified values rather than raw EMU.
        static long Scale(long emu, double f) => (long)Math.Round(emu * f / 12700.0) * 12700L;
        xfrm.Offset!.X = Scale(xfrm.Offset.X!.Value, sx);
        xfrm.Offset.Y = Scale(xfrm.Offset.Y!.Value, sy);
        xfrm.Extents!.Cx = Scale(xfrm.Extents.Cx!.Value, sx);
        xfrm.Extents.Cy = Scale(xfrm.Extents.Cy!.Value, sy);
    }

    private static Shape? FindPlaceholderByFamily(ShapeTree? tree, bool isTitle)
    {
        if (tree == null) return null;
        foreach (var sp in tree.Elements<Shape>())
        {
            var ph = sp.NonVisualShapeProperties?.ApplicationNonVisualDrawingProperties
                ?.GetFirstChild<PlaceholderShape>();
            if (ph == null) continue;
            var t = ph.Type?.HasValue == true ? ph.Type.Value : PlaceholderValues.Object;
            var match = isTitle
                ? t == PlaceholderValues.Title || t == PlaceholderValues.CenteredTitle
                : t == PlaceholderValues.Body || t == PlaceholderValues.SubTitle || t == PlaceholderValues.Object;
            if (match) return sp;
        }
        return null;
    }
}
