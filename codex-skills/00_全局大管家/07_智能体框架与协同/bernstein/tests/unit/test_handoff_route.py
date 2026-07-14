"""Unit tests for the dashboard handoff route (op-005)."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from bernstein.core.handoff import HandoffTokenStore, StreamTailBuffer
from bernstein.core.routes.handoff import router


def _make_app(workdir: Path) -> FastAPI:
    app = FastAPI()
    app.state.workdir = workdir
    app.include_router(router)
    return app


def test_get_handoff_returns_payload(tmp_path: Path) -> None:
    """A pending token is claimed and the recent tail comes back inline."""
    issued = HandoffTokenStore(tmp_path).issue(
        session_id="sess-1",
        task_id="t-1",
        source_surface="terminal",
        note="thread:42",
    )
    StreamTailBuffer(tmp_path, "sess-1").append(surface="terminal", text="line one")
    StreamTailBuffer(tmp_path, "sess-1").append(surface="terminal", text="line two")

    client = TestClient(_make_app(tmp_path))
    response = client.get(f"/handoff/{issued.token}")
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "sess-1"
    assert body["task_id"] == "t-1"
    assert body["source_surface"] == "terminal"
    assert body["note"] == "thread:42"
    assert [entry["text"] for entry in body["tail"]] == ["line one", "line two"]


def test_get_handoff_unknown_token_404(tmp_path: Path) -> None:
    """Unknown tokens return 404."""
    client = TestClient(_make_app(tmp_path))
    response = client.get("/handoff/never-issued")
    assert response.status_code == 404


def test_get_handoff_already_claimed_410(tmp_path: Path) -> None:
    """A second claim attempt returns 410 Gone."""
    issued = HandoffTokenStore(tmp_path).issue(session_id="sess-1")
    HandoffTokenStore(tmp_path).claim(issued.token, claimed_by="terminal")

    client = TestClient(_make_app(tmp_path))
    response = client.get(f"/handoff/{issued.token}")
    assert response.status_code == 410


def test_tail_query_caps_replay(tmp_path: Path) -> None:
    """The ``tail`` query parameter limits how many lines are returned."""
    issued = HandoffTokenStore(tmp_path).issue(session_id="sess-1")
    buf = StreamTailBuffer(tmp_path, "sess-1")
    for i in range(5):
        buf.append(surface="terminal", text=f"line {i}")

    client = TestClient(_make_app(tmp_path))
    response = client.get(f"/handoff/{issued.token}", params={"tail": 2})
    assert response.status_code == 200
    body = response.json()
    assert [entry["text"] for entry in body["tail"]] == ["line 3", "line 4"]
