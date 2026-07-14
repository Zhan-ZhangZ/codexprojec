"""Unit tests for the ``bernstein handoff`` CLI commands (op-005)."""

from __future__ import annotations

from pathlib import Path

import pytest
from click.testing import CliRunner

from bernstein.cli.commands.handoff_cmd import handoff_group
from bernstein.core.handoff import HandoffTokenStore, StreamTailBuffer


@pytest.fixture
def runner_in_tmp(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[CliRunner, Path]:
    """Run CLI commands inside a temp workdir so .sdd state is isolated."""
    monkeypatch.chdir(tmp_path)
    return CliRunner(), tmp_path


def test_emit_prints_token_and_persists(runner_in_tmp: tuple[CliRunner, Path]) -> None:
    """``handoff emit`` prints a token and writes it to disk."""
    runner, workdir = runner_in_tmp
    result = runner.invoke(handoff_group, ["emit", "--session", "sess-1", "--task", "t-1"])
    assert result.exit_code == 0, result.output
    token = result.output.strip().splitlines()[0]
    assert token, "expected a token on stdout"

    stored = HandoffTokenStore(workdir).get(token)
    assert stored is not None
    assert stored.session_id == "sess-1"
    assert stored.task_id == "t-1"
    assert stored.source_surface == "terminal"


def test_claim_round_trip(runner_in_tmp: tuple[CliRunner, Path]) -> None:
    """``handoff claim`` consumes a token issued by ``emit``."""
    runner, workdir = runner_in_tmp
    issued = runner.invoke(handoff_group, ["emit", "--session", "sess-1"])
    token = issued.output.strip().splitlines()[0]

    # Pre-seed a tail line so the replay path is exercised.
    StreamTailBuffer(workdir, "sess-1").append(surface="terminal", text="hello from terminal")

    claimed = runner.invoke(handoff_group, ["claim", token, "--as", "terminal"])
    assert claimed.exit_code == 0, claimed.output
    assert "attached to session sess-1" in claimed.output
    assert "[terminal] hello from terminal" in claimed.output


def test_claim_unknown_token_errors(runner_in_tmp: tuple[CliRunner, Path]) -> None:
    """``handoff claim`` exits non-zero on an unknown token."""
    runner, _ = runner_in_tmp
    result = runner.invoke(handoff_group, ["claim", "nope"])
    assert result.exit_code != 0
    assert "unknown handoff token" in (result.output + (result.stderr or "")).lower()


def test_claim_already_claimed_errors(runner_in_tmp: tuple[CliRunner, Path]) -> None:
    """A second claim returns a CLI error instead of crashing."""
    runner, _ = runner_in_tmp
    issued = runner.invoke(handoff_group, ["emit", "--session", "sess-1"])
    token = issued.output.strip().splitlines()[0]
    runner.invoke(handoff_group, ["claim", token])

    second = runner.invoke(handoff_group, ["claim", token])
    assert second.exit_code != 0
    assert "could not claim handoff token" in (second.output + (second.stderr or "")).lower()


def test_status_lists_pending_tokens(runner_in_tmp: tuple[CliRunner, Path]) -> None:
    """``handoff status`` prints live tokens after ``emit``."""
    runner, _ = runner_in_tmp
    runner.invoke(handoff_group, ["emit", "--session", "sess-1"])
    result = runner.invoke(handoff_group, ["status"])
    assert result.exit_code == 0
    assert "session=sess-1" in result.output
    assert "state=pending" in result.output
