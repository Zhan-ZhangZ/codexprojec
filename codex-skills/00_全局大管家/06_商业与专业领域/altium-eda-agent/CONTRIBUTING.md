# Contributing to eda-agent

Thanks for your interest. This project is an early-stage MCP server that
bridges large language models to Altium Designer through a DelphiScript
side-channel. It is single-maintainer and Windows-only by necessity (Altium
runs on Windows).

Before opening a non-trivial change, please file an issue first so we can
discuss scope. Drive-by patches that change architecture or rename public
APIs are unlikely to land without prior agreement.

## Ground rules

- Be respectful. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- Security-sensitive issues do **not** go in public issues. See
  [`SECURITY.md`](SECURITY.md).
- By contributing you agree your contribution is licensed under
  Apache-2.0 (the project licence).

## Development environment

Required:

- Windows 10 / 11
- A licensed Altium Designer install (the Pascal side is tested against
  recent versions, but the API is stable across releases)
- Python 3.11 or newer
- `pip install -e .[dev]` from the repository root

Optional but recommended:

- Free Pascal (`fpc`) for the offline Pascal cross-validation tests under
  `tests/cross_validate_pascal.pas`
- An IDE that understands `pyproject.toml` (VS Code, PyCharm)

## Running the agent locally

1. Install the package in editable mode: `pip install -e .[dev]`
2. Install the Altium-side scripts: `eda-agent install-scripts`
3. In Altium, open `Altium_API.PrjScr` and run `Dispatcher > StartMCPServer`
4. From an MCP client, connect to the `eda-agent` stdio server

The Python side polls a workspace directory for JSON responses from the
Pascal side; the workspace pointer lives at
`C:\ProgramData\eda-agent\workspace-path.txt`.

## Tests

- `pytest` runs the Python suite
- `python tests/test_cross_validate.py` runs the offline Pascal validator
  (requires Free Pascal in PATH)

The Pascal scripts cannot be fully unit-tested without a running Altium
instance — cross-validation runs the same logic compiled by `fpc` against
mocked Altium objects and is the only honest pre-Altium check.

## Pull requests

- Keep PRs focused. One concern per PR.
- Include a clear description of the problem and the chosen approach.
- If you touch Pascal: remember that Altium caches scripts. Reviewers will
  need to restart Altium to see your changes in effect.
- Add or update tests when behaviour changes.
- Run `pytest` locally before requesting review.

## Commit messages

Use the conventional-commit style already present in the repository:

```
type(scope): short summary

Longer body if needed, wrapped at ~72 columns.
```

Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `revert`.
Scopes used in this repo include `pcb`, `sch`, `design`, `altium`,
`bridge`, `installer`.

## Reporting bugs

See [`.github/ISSUE_TEMPLATE/bug_report.md`](.github/ISSUE_TEMPLATE/bug_report.md).
Include the Altium version, the `eda-agent --version` output, and — if you
can — the contents of the workspace `response.json` from the failing call.

## Suggesting features

See [`.github/ISSUE_TEMPLATE/feature_request.md`](.github/ISSUE_TEMPLATE/feature_request.md).
Concrete use cases beat speculative API additions.
