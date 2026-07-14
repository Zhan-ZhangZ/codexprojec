"""
In-process async job runner for the Agent Gateway.

Backtests, experiment pipelines, and structured tuning are CPU/IO heavy;
HTTP clients (especially LLM-driven agents) prefer "submit + poll" semantics.
We persist every job in `qd_agent_jobs` so the API survives worker restarts
and so audit can correlate jobs with the agent that triggered them.

Why not Celery?  Local-first deployments do not want another broker.  A
bounded thread pool keeps the operational surface small.  If/when you outgrow
this, swap the executor for Celery/RQ without changing the route layer.

Progress streaming
------------------
Runners may accept a second positional argument `on_progress(dict)`. Each
call merges into a per-job event ring (kept in-process for low latency) and
also persists the latest snapshot in the `progress` JSONB column so a fresh
SSE client can replay where it left off.
"""
from __future__ import annotations

import inspect
import json
import os
import threading
import time
import traceback
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Callable, Iterator, Optional

from app.utils.db import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)


# Per-job in-process event buffer (monotonic seq → event dict).
# We only keep the most recent N events to bound memory.
_PROGRESS_RING_SIZE = 200
_progress_buffers: dict[str, deque] = {}
_progress_locks: dict[str, threading.Lock] = {}
_progress_signals: dict[str, threading.Event] = {}
_progress_global_lock = threading.Lock()


def _max_workers() -> int:
    try:
        return max(1, int(os.getenv("AGENT_JOBS_MAX_WORKERS", "4")))
    except Exception:
        return 4


_executor: Optional[ThreadPoolExecutor] = None
_lock = threading.Lock()


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is not None:
        return _executor
    with _lock:
        if _executor is None:
            _executor = ThreadPoolExecutor(
                max_workers=_max_workers(),
                thread_name_prefix="agent-job",
            )
        return _executor


def _new_job_id() -> str:
    return uuid.uuid4().hex


def submit_job(
    *,
    user_id: int,
    agent_token_id: Optional[int],
    kind: str,
    request_payload: dict,
    runner: Callable[..., Any],
    idempotency_key: Optional[str] = None,
) -> dict:
    """Persist a job row and dispatch its runner on the thread pool.

    The runner may take either signature:
        ``runner(payload) -> result``                       (no streaming)
        ``runner(payload, on_progress) -> result``          (streaming)

    where ``on_progress(dict)`` is called by the runner to publish partial
    results.  Each call is delivered to live SSE subscribers AND persisted on
    the job row so reconnecting clients can replay the latest snapshot.
    """
    job_id = _new_job_id()
    created_at = datetime.utcnow()
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO qd_agent_jobs
              (job_id, user_id, agent_token_id, kind, status, request, idempotency_key, created_at)
            VALUES (%s, %s, %s, %s, 'queued', %s::jsonb, %s, %s)
            """,
            (
                job_id, int(user_id), agent_token_id, kind,
                json.dumps(request_payload, default=str),
                idempotency_key, created_at,
            ),
        )
        db.commit()
        cur.close()

    accepts_progress = _runner_accepts_progress(runner)

    def _run() -> None:
        _set_status(job_id, "running", started_at=datetime.utcnow())
        # Emit a synthetic "queued -> running" event so SSE clients see *something*
        # before the runner publishes its first real progress update.
        _publish_progress(job_id, {"phase": "running", "ts": time.time()})
        try:
            if accepts_progress:
                def _on_progress(snapshot: Any) -> None:
                    if not isinstance(snapshot, dict):
                        snapshot = {"value": snapshot}
                    _publish_progress(job_id, snapshot)
                result = runner(request_payload, _on_progress)
            else:
                result = runner(request_payload)
            _set_result(job_id, result)
            _publish_progress(job_id, {"phase": "succeeded", "ts": time.time()}, terminal=True)
        except Exception as exc:
            tb = traceback.format_exc()
            logger.error(f"agent_job {job_id} kind={kind} failed: {exc}\n{tb}")
            _set_failure(job_id, f"{exc}\n{tb[-2000:]}")
            _publish_progress(
                job_id,
                {"phase": "failed", "error": str(exc)[:500], "ts": time.time()},
                terminal=True,
            )

    _get_executor().submit(_run)

    return {
        "job_id": job_id,
        "status": "queued",
        "kind": kind,
        "created_at": created_at.isoformat() + "Z",
    }


def _runner_accepts_progress(runner: Callable) -> bool:
    """True if `runner` declares a second positional parameter (on_progress)."""
    try:
        sig = inspect.signature(runner)
    except (TypeError, ValueError):
        return False
    params = [
        p for p in sig.parameters.values()
        if p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
    ]
    return len(params) >= 2


# ──────────────────────────── progress / streaming ────────────────────────────

def _job_signal(job_id: str) -> threading.Event:
    with _progress_global_lock:
        ev = _progress_signals.get(job_id)
        if ev is None:
            ev = threading.Event()
            _progress_signals[job_id] = ev
        return ev


def _job_buffer(job_id: str) -> tuple[deque, threading.Lock]:
    with _progress_global_lock:
        buf = _progress_buffers.get(job_id)
        if buf is None:
            buf = deque(maxlen=_PROGRESS_RING_SIZE)
            _progress_buffers[job_id] = buf
            _progress_locks[job_id] = threading.Lock()
        return buf, _progress_locks[job_id]


def _publish_progress(job_id: str, event: dict, *, terminal: bool = False) -> None:
    """Record a progress event in-memory + persist latest snapshot to DB."""
    buf, lock = _job_buffer(job_id)
    seq = (buf[-1]["seq"] + 1) if buf else 1
    record = {"seq": seq, "ts": event.get("ts") or time.time(), "data": event, "terminal": terminal}
    with lock:
        buf.append(record)
    _job_signal(job_id).set()
    # Persist last snapshot so cold reconnects see something.
    try:
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "UPDATE qd_agent_jobs SET progress = %s::jsonb WHERE job_id = %s",
                (json.dumps(event, default=str), job_id),
            )
            db.commit()
            cur.close()
    except Exception as exc:
        logger.debug(f"agent_jobs: progress persist failed for {job_id}: {exc}")


def stream_progress(job_id: str, *, since_seq: int = 0, idle_timeout_s: float = 60.0) -> Iterator[dict]:
    """Generator that yields progress events for a job until terminal.

    Yields dicts of shape `{seq, ts, data, terminal}`. Caller is responsible
    for serialization (e.g. into SSE frames).  Stops after a terminal event
    is delivered, or after `idle_timeout_s` seconds with no new events.
    """
    buf, lock = _job_buffer(job_id)
    last_seq = since_seq
    deadline = time.monotonic() + idle_timeout_s

    while True:
        with lock:
            pending = [r for r in list(buf) if r["seq"] > last_seq]
        for rec in pending:
            yield rec
            last_seq = rec["seq"]
            if rec.get("terminal"):
                _gc_job_state(job_id)
                return
            deadline = time.monotonic() + idle_timeout_s

        # Wait for the next signal or until the idle window expires.
        ev = _job_signal(job_id)
        wait_for = max(0.0, deadline - time.monotonic())
        if wait_for == 0.0:
            return
        ev.wait(timeout=min(wait_for, 5.0))
        ev.clear()


def _gc_job_state(job_id: str) -> None:
    with _progress_global_lock:
        _progress_buffers.pop(job_id, None)
        _progress_locks.pop(job_id, None)
        _progress_signals.pop(job_id, None)


def _set_status(job_id: str, status: str, *, started_at: Optional[datetime] = None) -> None:
    with get_db_connection() as db:
        cur = db.cursor()
        if started_at is not None:
            cur.execute(
                "UPDATE qd_agent_jobs SET status = %s, started_at = %s WHERE job_id = %s",
                (status, started_at, job_id),
            )
        else:
            cur.execute(
                "UPDATE qd_agent_jobs SET status = %s WHERE job_id = %s",
                (status, job_id),
            )
        db.commit()
        cur.close()


def _set_result(job_id: str, result: Any) -> None:
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE qd_agent_jobs
            SET status = 'succeeded', result = %s::jsonb, finished_at = NOW()
            WHERE job_id = %s
            """,
            (json.dumps(result, default=str), job_id),
        )
        db.commit()
        cur.close()


def _set_failure(job_id: str, error: str) -> None:
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE qd_agent_jobs
            SET status = 'failed', error = %s, finished_at = NOW()
            WHERE job_id = %s
            """,
            (error[:6000], job_id),
        )
        db.commit()
        cur.close()


def get_job(job_id: str, *, user_id: int) -> Optional[dict]:
    """Tenant-scoped job lookup."""
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            SELECT job_id, user_id, agent_token_id, kind, status, request,
                   result, error, progress, created_at, started_at, finished_at
            FROM qd_agent_jobs
            WHERE job_id = %s AND user_id = %s
            """,
            (job_id, int(user_id)),
        )
        row = cur.fetchone()
        cur.close()
    return row


def list_jobs(*, user_id: int, kind: Optional[str] = None, limit: int = 50) -> list[dict]:
    limit = max(1, min(int(limit or 50), 200))
    with get_db_connection() as db:
        cur = db.cursor()
        if kind:
            cur.execute(
                """
                SELECT job_id, kind, status, created_at, started_at, finished_at
                FROM qd_agent_jobs
                WHERE user_id = %s AND kind = %s
                ORDER BY id DESC LIMIT %s
                """,
                (int(user_id), kind, limit),
            )
        else:
            cur.execute(
                """
                SELECT job_id, kind, status, created_at, started_at, finished_at
                FROM qd_agent_jobs
                WHERE user_id = %s
                ORDER BY id DESC LIMIT %s
                """,
                (int(user_id), limit),
            )
        rows = cur.fetchall()
        cur.close()
    return rows or []
