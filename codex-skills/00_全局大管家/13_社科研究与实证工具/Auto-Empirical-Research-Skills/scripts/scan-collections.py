#!/usr/bin/env python3
"""Pattern-scan vendored skill collections for the risks the security report tracks.

[`SECURITY-SCAN-REPORT.md`](../SECURITY-SCAN-REPORT.md) covers the original
52-collection baseline plus a hand-run incremental scan of collections 49-70
(2026-07-15). Both were one-off efforts written up in prose, which means the
scan's *coverage* drifted the moment the next collection landed: 71 and 72 were
vendored afterwards and nothing recorded that they had never been looked at.

This script turns that into something that cannot drift:

- it implements the same thirteen risk dimensions as an executable scanner;
- it records what was scanned in `catalog/security-scan.json`, keyed by
  collection, so coverage is a fact rather than a memory;
- `--check` fails when a cataloged collection has no scan record, which is what
  `make validate` uses to keep the gap closed.

What this is **not**: it is a pattern scan, the same class of evidence as the
2026-07-15 addendum, and strictly weaker than the baseline's multi-agent content
read. A clean result here means "no known-bad pattern matched", not "reviewed
and safe". The report says so and so does the generated record; do not let a
green check here be read as the stronger claim.

Findings are triaged, not just counted. A vendored README quoting the upstream
author's own `curl | sh` install line is a documentation artifact, not an
executable risk, and the baseline scan reached that conclusion by hand for nine
hits. Rather than re-litigate those every run, confirmed-benign findings are
recorded with their reason in `catalog/security-scan.json` and suppressed on
later runs; anything *new* surfaces.

Zero third-party dependencies. Wired into `make validate` (`--check`) and
`make security-scan`.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
CATALOG = ROOT / "catalog" / "skills.json"
RECORD = ROOT / "catalog" / "security-scan.json"

# Binary and generated content the pattern scan cannot meaningfully read.
SKIP_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".pdf",
    ".zip", ".gz", ".tar", ".xz", ".7z", ".woff", ".woff2", ".ttf", ".otf",
    ".eot", ".mp4", ".mov", ".mp3", ".wav", ".dta", ".sav", ".rdata", ".rds",
    ".pyc", ".so", ".dylib", ".dll", ".xlsx", ".docx", ".pptx",
}
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", ".pytest_cache"}
MAX_BYTES = 2_000_000  # a file larger than this is data, not code we can read

# The thirteen risk dimensions of the baseline scan, as executable patterns.
# Each is (id, severity, description, regex).
CHECKS: tuple[tuple[str, str, str, re.Pattern], ...] = (
    (
        "pipe-to-shell", "high",
        "Downloads a script and pipes it straight into a shell",
        re.compile(r"(?:curl|wget)\b[^\n|]{0,200}\|\s*(?:sudo\s+)?(?:ba|z|k)?sh\b"),
    ),
    (
        "reverse-shell", "critical",
        "Opens an interactive shell back to a remote host",
        re.compile(
            r"(?:bash\s+-i\s*>&\s*/dev/tcp/)"
            r"|(?:nc\b[^\n]{0,60}-e\s*/bin/(?:ba)?sh)"
            r"|(?:socket\.socket\([^\n]{0,80}\)[^\n]{0,200}subprocess\.(?:call|Popen)\()"
        ),
    ),
    (
        # Decoding a blob is ordinary (images, attachments). Decoding one and
        # *running* it is the risk, so the pattern requires both on one line.
        "decode-then-execute", "critical",
        "Decodes a blob and executes the result",
        re.compile(
            r"(?:\beval\b|\bexec\b)\s*\(\s*(?:base64|codecs|binascii|bytes)\s*\."
            r"|(?:base64|codecs|binascii)\s*\.\s*[a-z0-9_]*(?:decode|unhexlify)\s*\("
            r"[^\n]{0,200}\)[^\n]{0,60}(?:\beval\b|\bexec\b)\s*\("
        ),
    ),
    (
        "long-base64-blob", "low",
        "Long base64-looking literal (usually an embedded image; check it is)",
        re.compile(r"[A-Za-z0-9+/]{400,}={0,2}"),
    ),
    (
        "credential-path", "medium",
        "Reads a well-known credential or key location",
        re.compile(
            r"~/\.(?:ssh/id_[a-z0-9]+|aws/credentials|netrc|npmrc|docker/config\.json)"
            r"|/\.ssh/id_(?:rsa|ed25519|ecdsa)\b"
            r"|\.git-credentials\b"
        ),
    ),
    (
        "env-exfiltration", "high",
        "Sends environment variables or secrets to a remote endpoint",
        re.compile(
            r"(?:os\.environ|process\.env|\$ENV|printenv|env\b)[^\n]{0,120}"
            r"(?:requests\.(?:post|put)|urllib[^\n]{0,40}urlopen|curl\s|fetch\(|axios\.)"
        ),
    ),
    (
        "remote-eval", "critical",
        "Fetches remote content and evaluates it",
        re.compile(
            r"(?:eval|exec)\s*\(\s*(?:requests\.get|urlopen|fetch)\("
            r"|(?:requests\.get|urlopen)\([^\n]{0,200}\)\s*\.\s*(?:text|read\(\))\s*\)?\s*\)"
            r"(?=[^\n]{0,40}(?:eval|exec))"
        ),
    ),
    (
        # `rm -rf ~/.cache/matplotlib` and `rm -rf /var/lib/apt/lists/*` are
        # routine; `rm -rf /` and `rm -rf ~` are not. The lookahead is what
        # separates them — without it the check fires on every Dockerfile and
        # every uninstall doc, and stops being read.
        "destructive-rm", "high",
        "Recursive force-delete of a bare root, home, or wildcard target",
        # Flags are matched loosely and then checked by a post-filter, so
        # `-rf`, `-fr`, `-r -f` and `--recursive --force` all count.
        re.compile(
            r"\brm\s+(?:-[a-zA-Z-]+\s+)+"
            r"(?:/|~|\$HOME|\*|\.)(?=[\"'\s;)&|]|$)"
        ),
    ),
    (
        "cryptominer", "critical",
        "Cryptocurrency mining signature",
        re.compile(
            r"\b(?:xmrig|stratum\+tcp|minergate|cryptonight|nicehash|coinhive)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "input-capture", "critical",
        "Keyboard or clipboard capture",
        re.compile(
            r"\b(?:pynput|keyboard\.Listener|GetAsyncKeyState|CGEventTapCreate)\b"
            r"|\bpyperclip\.paste\b[^\n]{0,120}(?:post|urlopen|send)"
        ),
    ),
    (
        "suspicious-webhook", "medium",
        "Posts to a chat/webhook endpoint",
        re.compile(
            r"https?://(?:hooks\.slack\.com|discord(?:app)?\.com/api/webhooks|"
            r"api\.telegram\.org/bot|webhook\.site|requestbin)",
            re.IGNORECASE,
        ),
    ),
    (
        "prompt-injection-marker", "high",
        "Text aimed at overriding an agent's instructions",
        re.compile(
            r"(?i)\b(?:ignore (?:all )?(?:previous|prior|above) instructions"
            r"|disregard (?:all )?(?:previous|prior) (?:instructions|rules)"
            r"|you are now in developer mode"
            r"|do not (?:tell|inform) the user)\b"
        ),
    ),
    (
        "obfuscated-python", "high",
        "Python written to hide what it does",
        re.compile(
            r"getattr\s*\(\s*__import__\s*\("
            r"|__import__\s*\(\s*(?:['\"]os['\"]|chr\()"
            r"|\bexec\s*\(\s*compile\s*\("
        ),
    ),
)


class Finding(dict):
    """A single pattern hit: check id, file, line, and the matched text."""


def looks_like_real_base64(blob: str) -> bool:
    """Reject long alphanumeric runs that are not actually base64.

    The `+` in base64's alphabet means a Stata line of concatenated variable
    names (``SUBSAustralia+SUBSAmericanSamoa+...``) matches the pattern. Such a
    run does not decode; a real embedded PNG or SVG data-URI does. Checking
    that removes the false positive without loosening the pattern.
    """
    try:
        base64.b64decode(blob, validate=True)
    except (binascii.Error, ValueError):
        return False
    return True


def is_recursive_force_delete(command: str) -> bool:
    """True when an `rm` invocation carries both a recursive and a force flag.

    Matching the flag cluster with a regex means picking an order; `rm -fr /` is
    as dangerous as `rm -rf /` and `rm -r -f /` is the same command again. Pull
    the flags out and ask the question directly instead.
    """
    flags = re.findall(r"(?<=\s)-[a-zA-Z-]+", command)
    joined = "".join(flags).lower()
    return "r" in joined and "f" in joined


# Extra per-check gates applied after a regex matches.
POST_FILTERS = {
    "long-base64-blob": looks_like_real_base64,
    "destructive-rm": is_recursive_force_delete,
}


class ScanError(RuntimeError):
    """The scan cannot be made reproducible in this checkout."""


def tracked_files() -> set[str]:
    """Every git-tracked path under skills/, submodules included.

    The scan reads the *tracked* tree, not the working tree, and the reason is
    the freshness check: `--check` compares a fresh scan against the committed
    record, so the scan has to be a function of the commit. Walking the
    directory made it a function of whoever happened to run it — a stray
    .DS_Store, a gitignored helper inside the submodule, or a log written by a
    previous run all changed the file counts, which is exactly how this first
    passed locally and failed in CI.
    """
    try:
        proc = subprocess.run(
            ["git", "ls-files", "--recurse-submodules", "-z", "--", "skills"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
    except OSError as exc:  # pragma: no cover - git missing
        raise ScanError(f"git is required for a reproducible scan: {exc}") from exc
    if proc.returncode != 0:
        raise ScanError(
            "git ls-files failed, so the scan cannot be made reproducible:\n"
            + proc.stderr.strip()
        )
    return {path for path in proc.stdout.split("\0") if path}


def is_scannable(path: Path) -> bool:
    if path.suffix.lower() in SKIP_SUFFIXES:
        return False
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    try:
        return path.stat().st_size <= MAX_BYTES
    except OSError:
        return False


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def scan_file(path: Path, rel: str) -> list[Finding]:
    text = read_text(path)
    if text is None:
        return []
    findings: list[Finding] = []
    for check_id, severity, description, pattern in CHECKS:
        post_filter = POST_FILTERS.get(check_id)
        for match in pattern.finditer(text):
            if post_filter is not None and not post_filter(match.group(0)):
                continue
            line = text.count("\n", 0, match.start()) + 1
            excerpt = match.group(0)
            if len(excerpt) > 120:
                excerpt = excerpt[:117] + "..."
            findings.append(
                Finding(
                    check=check_id,
                    severity=severity,
                    description=description,
                    file=rel,
                    line=line,
                    excerpt=excerpt.replace("\n", " "),
                )
            )
    return findings


def collection_dirs() -> list[Path]:
    if not SKILLS.exists():
        return []
    return sorted(
        p for p in SKILLS.iterdir() if p.is_dir() and not p.name.startswith(".")
    )


def scan_collection(directory: Path, tracked: set[str] | None = None) -> dict:
    if tracked is None:
        tracked = tracked_files()
    prefix = directory.relative_to(ROOT).as_posix() + "/"
    files_seen = 0
    files_scanned = 0
    findings: list[Finding] = []
    for rel in sorted(path for path in tracked if path.startswith(prefix)):
        path = ROOT / rel
        if not path.is_file():
            # Tracked but absent: an un-initialized submodule. Reported by the
            # per-collection counts rather than silently treated as scanned.
            continue
        files_seen += 1
        if not is_scannable(path):
            continue
        findings.extend(scan_file(path, rel))
        files_scanned += 1
    return {
        "collection": directory.name,
        "files_seen": files_seen,
        "files_scanned": files_scanned,
        "findings": findings,
    }


def load_record() -> dict:
    if not RECORD.exists():
        return {"schema_version": "1.0", "triaged": {}, "collections": {}}
    return json.loads(RECORD.read_text(encoding="utf-8"))


def finding_key(finding: dict) -> str:
    """Stable identity for a finding, so a triage decision survives re-runs.

    Deliberately excludes the line number: a benign `curl | sh` in a vendored
    README stays benign when the file above it gains a paragraph.
    """
    return f"{finding['check']}|{finding['file']}|{finding['excerpt']}"


def catalog_collections() -> list[str]:
    if not CATALOG.exists():
        return [d.name for d in collection_dirs()]
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    collections = data.get("collections")
    if isinstance(collections, list):
        out = []
        for item in collections:
            if isinstance(item, dict) and item.get("id"):
                out.append(item["id"])
            elif isinstance(item, str):
                out.append(item)
        if out:
            return sorted(out)
    return [d.name for d in collection_dirs()]


def run_scan() -> tuple[dict, list[Finding]]:
    record = load_record()
    triaged = record.get("triaged", {})
    collections: dict[str, dict] = {}
    untriaged: list[Finding] = []
    tracked = tracked_files()

    for directory in collection_dirs():
        result = scan_collection(directory, tracked)
        new_findings = [f for f in result["findings"] if finding_key(f) not in triaged]
        untriaged.extend(new_findings)
        collections[result["collection"]] = {
            "files_seen": result["files_seen"],
            "files_scanned": result["files_scanned"],
            "findings_total": len(result["findings"]),
            "findings_triaged_benign": len(result["findings"]) - len(new_findings),
            "findings_untriaged": len(new_findings),
        }
    record["collections"] = collections
    record["triaged"] = triaged
    return record, untriaged


def render_untriaged(findings: list[Finding]) -> str:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    lines = []
    for finding in sorted(findings, key=lambda f: (order.get(f["severity"], 9), f["file"])):
        lines.append(
            f"  [{finding['severity']:<8}] {finding['check']:<24} "
            f"{finding['file']}:{finding['line']}"
        )
        lines.append(f"             {finding['excerpt']}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail when a cataloged collection has no scan record, or a finding is untriaged",
    )
    parser.add_argument(
        "--collection", help="scan only this collection (does not update the record)"
    )
    args = parser.parse_args(argv)

    if args.collection:
        directory = SKILLS / args.collection
        if not directory.is_dir():
            print(f"no such collection: {args.collection}", file=sys.stderr)
            return 1
        try:
            result = scan_collection(directory)
        except ScanError as exc:
            print(str(exc), file=sys.stderr)
            return 1
        print(
            f"{result['collection']}: {result['files_scanned']} of "
            f"{result['files_seen']} files scanned, {len(result['findings'])} finding(s)"
        )
        if result["findings"]:
            print(render_untriaged(result["findings"]))
        return 0

    try:
        record, untriaged = run_scan()
    except ScanError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    scanned = set(record["collections"])
    cataloged = set(catalog_collections())
    unscanned = sorted(cataloged - scanned)

    empty = sorted(
        name for name, stats in record["collections"].items() if stats["files_seen"] == 0
    )

    if args.check:
        problems = []
        if empty:
            # Almost always an un-initialized submodule: the directory exists so
            # it looks scanned, but git lists none of its files, so the record
            # would silently claim coverage it does not have.
            problems.append(
                "these collections contributed no tracked files, so nothing was "
                "actually scanned: " + ", ".join(empty)
                + "\n  If one is a submodule, run: git submodule update --init --recursive"
            )
        if unscanned:
            problems.append(
                "collections in the catalog with no scan record: " + ", ".join(unscanned)
            )
        committed = load_record()
        if committed.get("collections") != record["collections"]:
            problems.append(
                "catalog/security-scan.json is stale. Regenerate with:\n"
                "  python3 scripts/scan-collections.py"
            )
        if untriaged:
            problems.append(
                f"{len(untriaged)} untriaged finding(s):\n" + render_untriaged(untriaged)
                + "\n  Review each, then record it under \"triaged\" in "
                "catalog/security-scan.json with a reason."
            )
        if problems:
            for problem in problems:
                print(problem, file=sys.stderr)
            return 1
        total_files = sum(c["files_scanned"] for c in record["collections"].values())
        print(
            f"Pattern scan current: {len(scanned)} collection(s), "
            f"{total_files} file(s), 0 untriaged finding(s)."
        )
        return 0

    RECORD.parent.mkdir(parents=True, exist_ok=True)
    RECORD.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    total_files = sum(c["files_scanned"] for c in record["collections"].values())
    print(
        f"Scanned {len(record['collections'])} collection(s), {total_files} file(s). "
        f"{len(untriaged)} untriaged finding(s)."
    )
    if untriaged:
        print(render_untriaged(untriaged))
        print(
            "\nReview each finding, then record the benign ones under \"triaged\" in "
            f"{RECORD.relative_to(ROOT)} with a reason."
        )
    print(f"Wrote {RECORD.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
