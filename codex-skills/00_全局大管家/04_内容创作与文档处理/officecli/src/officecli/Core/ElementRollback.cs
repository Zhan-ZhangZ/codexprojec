// Copyright 2026 OfficeCLI (https://OfficeCLI.AI)
// SPDX-License-Identifier: Apache-2.0

using DocumentFormat.OpenXml;

namespace OfficeCli.Core;

/// <summary>
/// Atomic rollback for a failed Set/Add: put an element back into the state
/// captured by <c>element.CloneNode(true)</c> before the mutation started.
///
/// The restore happens IN PLACE — the element keeps its object identity and
/// only its attributes and children are replaced by the snapshot's. The
/// previous rollback swapped the snapshot in with <c>Parent.ReplaceChild</c>:
/// the document looked untouched, but the original (partially mutated)
/// element was now detached, and every handler-side reference to it — the
/// Word navigation child caches, a live resident's next command — kept
/// pointing at the detached copy. Reads came back short (no effective.* chain,
/// half-applied formatting) and the next successful Set on that path reported
/// "Updated" while writing into the detached element (issue #424).
///
/// Children are the snapshot's clones, so callers that cache DESCENDANTS of
/// the restored element must still invalidate those caches.
/// </summary>
public static class ElementRollback
{
    public static void RestoreInPlace(OpenXmlElement element, OpenXmlElement snapshot)
    {
        element.ClearAllAttributes();
        foreach (var attr in snapshot.GetAttributes())
            element.SetAttribute(attr);
        foreach (var ns in snapshot.NamespaceDeclarations)
            if (element.LookupNamespace(ns.Key) == null)
                element.AddNamespaceDeclaration(ns.Key, ns.Value);

        element.RemoveAllChildren();
        foreach (var child in snapshot.ChildElements.ToList())
        {
            child.Remove();
            element.AppendChild(child);
        }
    }
}
