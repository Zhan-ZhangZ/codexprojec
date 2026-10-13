// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using W15 = DocumentFormat.OpenXml.Office2013.Word;
using W16CID = DocumentFormat.OpenXml.Office2019.Word.Cid;
using W16CEX = DocumentFormat.OpenXml.Office2021.Word.CommentsExt;

namespace OfficeCli.Handlers;

public partial class WordHandler
{
    // Modern comment metadata lives in word/commentsExtended.xml (w15) — reply
    // threading (w15:paraIdParent) and resolved-state (w15:done), keyed by each
    // comment's first-paragraph w14:paraId (NOT by w:id). The user-facing CLI
    // speaks comment ids (the /comments/comment[@commentId=N] the user sees);
    // these helpers translate id <-> paraId and own the w15 part so AddComment /
    // SetElementComment / readback never duplicate the part plumbing.

    /// <summary>Get-or-create the CommentsEx root in word/commentsExtended.xml.</summary>
    private W15.CommentsEx EnsureCommentsExRoot()
    {
        var main = _doc.MainDocumentPart
            ?? throw new InvalidOperationException("Document main part not found");
        var part = main.WordprocessingCommentsExPart
            ?? main.AddNewPart<WordprocessingCommentsExPart>();
        part.CommentsEx ??= new W15.CommentsEx();
        return part.CommentsEx;
    }

    /// <summary>
    /// First-paragraph w14:paraId of the comment with the given w:id, assigning a
    /// fresh paraId if the paragraph lacks one. Returns null when no such comment.
    /// </summary>
    private string? GetCommentFirstParaId(string commentId)
    {
        var comment = _doc.MainDocumentPart?.WordprocessingCommentsPart?.Comments?
            .Elements<Comment>().FirstOrDefault(c => c.Id?.Value == commentId);
        var firstPara = comment?.Descendants<Paragraph>().FirstOrDefault();
        if (firstPara == null) return null;
        if (string.IsNullOrEmpty(firstPara.ParagraphId?.Value)) AssignParaId(firstPara);
        return firstPara.ParagraphId?.Value;
    }

    /// <summary>
    /// Find-or-create the w15:commentEx for <paramref name="paraId"/> and apply the
    /// supplied parent/done (null = leave unchanged). New entries default Done=false
    /// to mirror Word's <c>w15:done="0"</c> output. Saves the part.
    /// </summary>
    private void UpsertCommentEx(string paraId, string? parentParaId, bool? done)
    {
        var root = EnsureCommentsExRoot();
        var ex = root.Elements<W15.CommentEx>().FirstOrDefault(e => e.ParaId?.Value == paraId);
        if (ex == null)
        {
            ex = new W15.CommentEx { ParaId = paraId, Done = OnOffValue.FromBoolean(false) };
            root.AppendChild(ex);
        }
        if (parentParaId != null) ex.ParaIdParent = parentParaId;
        if (done.HasValue) ex.Done = OnOffValue.FromBoolean(done.Value);
        _doc.MainDocumentPart!.WordprocessingCommentsExPart!.CommentsEx!.Save();
    }

    /// <summary>
    /// Word keeps up to three sidecar parts next to comments.xml, one entry per
    /// comment: commentsExtended.xml (w15: done / reply parent),
    /// commentsIds.xml (w16cid: paraId → durableId) and commentsExtensible.xml
    /// (w16cex: durableId → dateUtc). A comment added while those parts exist
    /// but without an entry in them leaves the parts cross-referentially
    /// inconsistent — each is schema-valid on its own, so `validate` is
    /// silent, but Word treats the file as damaged (issue #429). Keep every
    /// part that already exists in step; never create one that does not.
    /// </summary>
    private void SyncNewCommentSidecars(Paragraph commentBody)
    {
        var main = _doc.MainDocumentPart;
        if (main == null) return;
        var idsPart = main.WordprocessingCommentsIdsPart;
        var extPart = main.GetPartsOfType<WordCommentsExtensiblePart>().FirstOrDefault();
        if (main.WordprocessingCommentsExPart == null && idsPart == null && extPart == null) return;

        if (string.IsNullOrEmpty(commentBody.ParagraphId?.Value)) AssignParaId(commentBody);
        var paraId = commentBody.ParagraphId!.Value!;

        if (main.WordprocessingCommentsExPart != null) UpsertCommentEx(paraId, null, null);

        string? durableId = null;
        if (idsPart != null)
        {
            idsPart.CommentsIds ??= new W16CID.CommentsIds();
            var existing = idsPart.CommentsIds.Elements<W16CID.CommentId>().FirstOrDefault(c => c.ParaId?.Value == paraId);
            if (existing == null)
            {
                durableId = NewDurableId();
                idsPart.CommentsIds.AppendChild(new W16CID.CommentId { ParaId = paraId, DurableId = durableId });
                idsPart.CommentsIds.Save();
            }
            else durableId = existing.DurableId?.Value;
        }
        if (extPart != null)
        {
            extPart.CommentsExtensible ??= new W16CEX.CommentsExtensible();
            durableId ??= NewDurableId();
            if (!extPart.CommentsExtensible.Elements<W16CEX.CommentExtensible>().Any(c => c.DurableId?.Value == durableId))
            {
                extPart.CommentsExtensible.AppendChild(new W16CEX.CommentExtensible
                {
                    DurableId = durableId,
                    // Word writes whole seconds ("2026-09-24T08:02:17Z").
                    DateUtc = new DateTimeValue(new DateTime(DateTime.UtcNow.Ticks - DateTime.UtcNow.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc)),
                });
                extPart.CommentsExtensible.Save();
            }
        }
    }

    /// <summary>Drop a removed comment's entries from every sidecar part that carries one.</summary>
    private void RemoveCommentSidecars(Comment comment)
    {
        var main = _doc.MainDocumentPart;
        var paraId = comment.Descendants<Paragraph>().FirstOrDefault()?.ParagraphId?.Value;
        if (main == null || string.IsNullOrEmpty(paraId)) return;

        var exRoot = main.WordprocessingCommentsExPart?.CommentsEx;
        var ex = exRoot?.Elements<W15.CommentEx>().FirstOrDefault(e => e.ParaId?.Value == paraId);
        if (ex != null) { ex.Remove(); exRoot!.Save(); }

        string? durableId = null;
        var idsRoot = main.WordprocessingCommentsIdsPart?.CommentsIds;
        var id = idsRoot?.Elements<W16CID.CommentId>().FirstOrDefault(c => c.ParaId?.Value == paraId);
        if (id != null) { durableId = id.DurableId?.Value; id.Remove(); idsRoot!.Save(); }

        if (durableId == null) return;
        var extRoot = main.GetPartsOfType<WordCommentsExtensiblePart>().FirstOrDefault()?.CommentsExtensible;
        var ext = extRoot?.Elements<W16CEX.CommentExtensible>().FirstOrDefault(c => c.DurableId?.Value == durableId);
        if (ext != null) { ext.Remove(); extRoot!.Save(); }
    }

    // Word's durableId is 8 hex digits; keep the top bit clear like Word does.
    private static string NewDurableId()
        => (Random.Shared.Next(0x10000000, 0x7FFFFFFF)).ToString("X8");

    /// <summary>
    /// Read the resolved-state and reply-parent of a comment for Get/Query.
    /// Returns the PARENT COMMENT's w:id (translated back from w15:paraIdParent)
    /// so the readback matches the id the caller passes to `--prop parentId=`,
    /// and the done flag (false when the comment has no commentEx entry).
    /// </summary>
    private (string? parentId, bool done) ReadCommentExInfo(Comment comment)
    {
        var paraId = comment.Descendants<Paragraph>().FirstOrDefault()?.ParagraphId?.Value;
        var part = _doc.MainDocumentPart?.WordprocessingCommentsExPart;
        if (string.IsNullOrEmpty(paraId) || part?.CommentsEx == null) return (null, false);
        var ex = part.CommentsEx.Elements<W15.CommentEx>()
            .FirstOrDefault(e => e.ParaId?.Value == paraId);
        if (ex == null) return (null, false);
        bool done = TryReadOnOff(ex.Done) == true;
        string? parentId = null;
        var parentParaId = ex.ParaIdParent?.Value;
        if (!string.IsNullOrEmpty(parentParaId))
        {
            var parent = _doc.MainDocumentPart?.WordprocessingCommentsPart?.Comments?
                .Elements<Comment>().FirstOrDefault(c =>
                    c.Descendants<Paragraph>().FirstOrDefault()?.ParagraphId?.Value == parentParaId);
            parentId = parent?.Id?.Value;
        }
        return (parentId, done);
    }
}
