---
name: replace-with-skill-name
description: >
  State the concrete outcome this skill delivers. Use when the request mentions
  specific tasks, files, APIs, symptoms, or goals that should activate it.
---

# Replace with skill title

Deliver the outcome in one sentence. State the baseline version for new projects and preserve an
existing project's pinned version unless migration is requested.

## When to use

- Use when …
- Use when …

**When not to use:** hand off nearby work to `$related-skill` or the relevant engine skill.

## Workflow

1. **Inspect.** Read the project manifest, relevant files, existing conventions, and constraints.
2. **Choose.** Select the smallest compatible approach and state any consequential assumption.
3. **Implement.** Make the focused change using the project's current version and patterns.
4. **Verify.** Run the smallest meaningful check and inspect the real output.
5. **Handoff.** Report changed files, evidence, caveats, and the next useful action.

## Patterns

### Focused pattern

```text
Use a compact, verified example. Do not invent APIs.
```

## Pitfalls

- **Visible symptom** → likely cause; concrete fix and verification.
- **Version mismatch** → inspect the installed version and use its matching docs or migration guide.

## Resources

- Read `references/example.md` only when deeper detail is needed.
- Run `scripts/example.py --help` before using the optional helper.
- Copy `assets/example.ext` only when the task needs the starter asset.

## Related skills

- `$related-skill` — the adjacent responsibility it owns.
