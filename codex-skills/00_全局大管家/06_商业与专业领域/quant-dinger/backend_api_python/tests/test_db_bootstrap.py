"""Bootstrap-time DB behaviour: auto-migrate + permission probe.

These verify the two safety nets in ``app.utils.db.init_database``:

1. ``_apply_init_sql`` is idempotent and tolerant — a missing schema file or
   a failing migration must NOT crash startup, only emit a warning. Crashing
   here would break upgrades in the field where the file might be stripped
   or the DB user temporarily lacks DDL rights.

2. ``_verify_table_access`` collects every permission failure (instead of
   aborting on the first one) so the operator sees the full list in a single
   banner, then continues startup. The previous behaviour was to start
   "successfully" and let every 10s worker tick spam ``InsufficientPrivilege``,
   making the root cause hard to spot.
"""

import logging
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.utils import db as db_module


class _FakeCursor:
    """Cursor that fails for a configurable set of table names."""

    def __init__(self, deny_tables=()):
        self._deny = set(deny_tables)

    def execute(self, sql, *args, **kwargs):
        for name in self._deny:
            if name in sql:
                raise RuntimeError(f"permission denied for table {name}")
        return None

    def close(self):
        pass


class _FakeConn:
    def __init__(self, deny_tables=()):
        self._deny_tables = deny_tables
        self.committed = False
        self.rolled_back = 0

    def cursor(self):
        return _FakeCursor(self._deny_tables)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back += 1


class _FakeConnCtx:
    """Stand-in for ``get_db_connection()`` context manager."""

    def __init__(self, conn):
        self._conn = conn

    def __enter__(self):
        return self._conn

    def __exit__(self, *exc):
        return False


def test_apply_init_sql_skips_quietly_when_file_missing(tmp_path, caplog, monkeypatch):
    """Missing migrations file → warning + early return, never raise."""
    missing = tmp_path / 'does_not_exist.sql'
    monkeypatch.setattr(db_module, '_resolve_init_sql_path', lambda: missing)

    with caplog.at_level(logging.WARNING):
        db_module._apply_init_sql(logging.getLogger('test'))

    assert any('not found' in rec.message for rec in caplog.records)


def test_apply_init_sql_warns_but_does_not_raise_on_db_failure(tmp_path, caplog, monkeypatch):
    """A failing migration is downgraded to a warning — startup must continue."""
    fake_sql = tmp_path / 'init.sql'
    fake_sql.write_text("SELECT 1;", encoding='utf-8')
    monkeypatch.setattr(db_module, '_resolve_init_sql_path', lambda: fake_sql)

    # Have the cursor raise — simulates InsufficientPrivilege etc.
    bad_conn = _FakeConn()
    bad_conn.cursor = lambda: (_ for _ in ()).throw(RuntimeError("permission denied"))

    with patch.object(db_module, 'get_db_connection', return_value=_FakeConnCtx(bad_conn)):
        with caplog.at_level(logging.WARNING):
            # Must not raise — bootstrap continuation is the contract.
            db_module._apply_init_sql(logging.getLogger('test'))

    assert any('Auto-migrate failed' in rec.message for rec in caplog.records)


def test_apply_init_sql_commits_on_success(tmp_path, monkeypatch):
    """Happy path: file exists, cursor accepts every statement, conn.commit() runs.

    Without an explicit commit the schema apply would silently roll back when
    the context manager exits — the previous lack of any commit call here was
    exactly the kind of bug we want this test to catch on refactor.
    """
    fake_sql = tmp_path / 'init.sql'
    fake_sql.write_text("CREATE TABLE IF NOT EXISTS foo (id INT);", encoding='utf-8')
    monkeypatch.setattr(db_module, '_resolve_init_sql_path', lambda: fake_sql)

    conn = _FakeConn(deny_tables=())
    with patch.object(db_module, 'get_db_connection', return_value=_FakeConnCtx(conn)):
        db_module._apply_init_sql(logging.getLogger('test'))

    assert conn.committed, "_apply_init_sql must commit on success"


def test_verify_table_access_logs_ok_when_all_tables_readable(caplog):
    conn = _FakeConn(deny_tables=())
    with patch.object(db_module, 'get_db_connection', return_value=_FakeConnCtx(conn)):
        with caplog.at_level(logging.INFO):
            db_module._verify_table_access(logging.getLogger('test'))

    assert any('permission probe OK' in rec.message for rec in caplog.records)
    # No banner / error level entries when everything's fine.
    assert not any(rec.levelno >= logging.ERROR for rec in caplog.records)


def test_verify_table_access_collects_all_failures_and_emits_banner(caplog):
    """All failing tables must appear in a single banner, in the order we probe.

    Previous behaviour: the first ``InsufficientPrivilege`` aborted the loop
    because Postgres left the transaction in a failed state. We now rollback
    after each probe so subsequent tables still get checked.
    """
    denied = {'pending_orders', 'qd_strategy_positions'}
    conn = _FakeConn(deny_tables=denied)

    with patch.object(db_module, 'get_db_connection', return_value=_FakeConnCtx(conn)):
        with caplog.at_level(logging.ERROR):
            db_module._verify_table_access(logging.getLogger('test'))

    error_text = '\n'.join(rec.message for rec in caplog.records if rec.levelno >= logging.ERROR)
    for table in denied:
        assert table in error_text, f"banner is missing {table}"
    assert 'PERMISSION CHECK FAILED' in error_text
    assert 'ALTER TABLE' in error_text  # the fix recipe is present
    # And we expect at least one rollback per failure so the tx state stays clean.
    assert conn.rolled_back >= len(denied)


def test_init_database_respects_skip_auto_migrate(monkeypatch, caplog):
    """SKIP_AUTO_MIGRATE=true must bypass _apply_init_sql but still probe perms.

    This is the escape hatch for ops who manage schema externally (e.g. via
    Flyway/Liquibase) and don't want the backend touching DDL on every boot.
    """
    monkeypatch.setenv('SKIP_AUTO_MIGRATE', 'true')

    calls = {'apply': 0, 'verify': 0}

    def fake_apply(_logger):
        calls['apply'] += 1

    def fake_verify(_logger):
        calls['verify'] += 1

    monkeypatch.setattr(db_module, '_apply_init_sql', fake_apply)
    monkeypatch.setattr(db_module, '_verify_table_access', fake_verify)
    monkeypatch.setattr(db_module, 'is_postgres_available', lambda: True)

    with caplog.at_level(logging.INFO):
        db_module.init_database()

    assert calls['apply'] == 0, "auto-migrate should be skipped"
    assert calls['verify'] == 1, "permission probe must still run"
    assert any('SKIP_AUTO_MIGRATE' in rec.message for rec in caplog.records)
