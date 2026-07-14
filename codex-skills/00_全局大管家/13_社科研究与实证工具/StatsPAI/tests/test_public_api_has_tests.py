"""Guard: every public *callable* in the registry is referenced by a test.

CLAUDE.md §4 requires every outward-facing function to ship with at least one
correctness test and one boundary test. This guard operationalises the weaker
but mechanically-checkable half of that rule — *existence* of a test reference —
so a newly-registered ``sp.<fn>`` that nobody tested can never land silently.

Mechanism: scan every name token appearing under ``tests/`` and assert that
each public callable returned by ``sp.list_functions()`` shows up at least once.
Return-type *classes* (``CoxResult``, ``VARResult``, …) are exempt: they are
exercised indirectly through the estimator that returns them and are rarely
constructed by name in a test. The guard was seeded when the audit it encodes
had already driven the untested-callable count to zero (see
``tests/test_untested_public_api.py``); ``ALLOWED_UNTESTED`` therefore starts
empty. Adding a name here must be a deliberate, justified exception — the
default expectation is a real test, not an allowlist entry.
"""

from __future__ import annotations

import inspect
import pathlib
import re

import statspai as sp

# Deliberately-exempt public callables, each with a written justification.
# Keep this empty unless there is a genuine reason a symbol cannot be tested.
ALLOWED_UNTESTED: dict[str, str] = {}


def _test_name_tokens() -> set[str]:
    test_root = pathlib.Path(__file__).resolve().parent
    tokens: set[str] = set()
    for path in test_root.rglob("*.py"):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        tokens.update(re.findall(r"[A-Za-z_][A-Za-z0-9_]*", text))
    return tokens


def _public_callables() -> list[str]:
    names = []
    for name in sp.list_functions():
        obj = getattr(sp, name, None)
        if obj is None:
            continue
        # Return-type classes are tested through their producing function.
        if inspect.isclass(obj):
            continue
        if callable(obj):
            names.append(name)
    return names


def test_every_public_callable_is_referenced_in_tests():
    tokens = _test_name_tokens()
    callables = _public_callables()
    assert callables, "registry exposed no public callables — audit logic broke"

    missing = sorted(
        name
        for name in callables
        if name not in tokens and name not in ALLOWED_UNTESTED
    )
    assert not missing, (
        f"{len(missing)} public callable(s) registered with NO test reference: "
        f"{missing}. Add a test (preferred) under tests/, or — only with a "
        f"written justification — an entry in ALLOWED_UNTESTED."
    )


def test_allowlist_entries_are_still_public_callables():
    # Prevent the allowlist from rotting: an entry that no longer names a
    # public callable is dead weight that should be removed.
    callables = set(_public_callables())
    stale = sorted(name for name in ALLOWED_UNTESTED if name not in callables)
    assert not stale, (
        f"ALLOWED_UNTESTED names that are no longer public callables: {stale}. "
        f"Remove them."
    )
