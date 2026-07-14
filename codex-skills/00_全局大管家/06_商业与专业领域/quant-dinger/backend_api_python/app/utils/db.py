"""
Database Connection Utility - PostgreSQL Only

Provides unified interface for PostgreSQL database operations.

Usage:
    from app.utils.db import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        conn.commit()

Configuration:
    DATABASE_URL=postgresql://user:password@host:port/dbname
"""

import os
from pathlib import Path

# Re-export from PostgreSQL module
from app.utils.db_postgres import (
    get_pg_connection as get_db_connection,
    get_pg_connection_sync as get_db_connection_sync,
    is_postgres_available,
    close_pool as close_db,
)

# Tables that every backend worker / route touches in the hot path.  If the
# configured Postgres user can't `SELECT` from these, the server starts but
# everything past auth quietly errors with InsufficientPrivilege; we surface
# that loudly at boot instead of silently spamming worker logs forever.
_CRITICAL_TABLES = (
    'qd_users',
    'pending_orders',
    'qd_strategy_positions',
    'qd_strategies_trading',
    'qd_analysis_memory',
)


def get_db_type() -> str:
    """Get database type (always postgresql)"""
    return 'postgresql'


def is_postgres() -> bool:
    """Check if using PostgreSQL (always True)"""
    return True


def init_database():
    """Initialize the database connection, apply schema, and probe permissions.

    Two deployment styles have to land here without diverging:

    1. **Docker compose** — the Postgres container's entrypoint runs
       ``/docker-entrypoint-initdb.d/init.sql`` on first boot. Our re-apply on
       every backend start is a no-op because ``init.sql`` is fully idempotent
       (``CREATE TABLE IF NOT EXISTS`` everywhere).
    2. **Bare-metal / Windows local PG** — nothing runs ``init.sql`` for the
       operator. Previously they had to manually ``psql -f migrations/init.sql``
       before starting the backend, otherwise every worker exploded with
       ``relation does not exist``. We now apply it ourselves.

    After the schema apply we ping every critical table with ``SELECT 1
    LIMIT 0``. This catches the *other* common deployment pitfall: the schema
    was created by ``postgres`` (superuser) but ``DATABASE_URL`` points to a
    non-owner user that lacks ``SELECT``. Without the probe the backend looks
    healthy at boot and only fails 10 seconds later inside ``PendingOrderWorker``.
    """
    from app.utils.logger import get_logger
    logger = get_logger(__name__)

    if not is_postgres_available():
        raise RuntimeError("Cannot connect to PostgreSQL. Check DATABASE_URL.")
    logger.info("PostgreSQL connection verified")

    if os.getenv('SKIP_AUTO_MIGRATE', '').lower() not in ('1', 'true', 'yes'):
        _apply_init_sql(logger)
    else:
        logger.info("SKIP_AUTO_MIGRATE is set; not running init.sql on boot")

    _verify_table_access(logger)


def _resolve_init_sql_path() -> Path:
    """Locate ``migrations/init.sql`` relative to this file.

    Extracted as its own function so tests can monkeypatch the path without
    needing to mock the whole ``Path(...).resolve().parent.parent.parent``
    chain (which is brittle and obscures intent).
    """
    return Path(__file__).resolve().parent.parent.parent / 'migrations' / 'init.sql'


def _apply_init_sql(logger):
    """Run ``migrations/init.sql`` idempotently.

    Failures are downgraded to a warning rather than aborting startup — the
    most common cause of failure here is *also* the most common cause of the
    permission probe failing below (non-owner DB user). We want both signals
    visible in the log, not a hard crash that hides them.
    """
    init_sql = _resolve_init_sql_path()
    if not init_sql.exists():
        logger.warning(
            "init.sql not found at %s — skipping auto-migrate. "
            "If you're on a fresh local PG, run it manually before starting the backend.",
            init_sql,
        )
        return

    try:
        sql_text = init_sql.read_text(encoding='utf-8')
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute(sql_text)
            finally:
                cur.close()
            conn.commit()
        logger.info("Applied %s (%d bytes)", init_sql.name, init_sql.stat().st_size)
    except Exception as exc:
        logger.warning(
            "Auto-migrate failed (continuing with existing schema): %s. "
            "If this is a permission error, run 'ALTER TABLE ... OWNER TO <db_user>' "
            "or set SKIP_AUTO_MIGRATE=true to silence this on boot.",
            exc,
        )


def _verify_table_access(logger):
    """Probe ``SELECT 1`` on every critical table.

    Each probe runs in its own transaction so that one ``InsufficientPrivilege``
    doesn't abort the rest of the checks (Postgres puts the whole tx into a
    failed state after the first error). We collect all failures, then emit a
    single high-visibility banner so the operator sees the full list and the
    fix recipe at once.
    """
    failures = []
    try:
        with get_db_connection() as conn:
            for table in _CRITICAL_TABLES:
                cur = conn.cursor()
                try:
                    cur.execute(f"SELECT 1 FROM {table} LIMIT 0")
                except Exception as exc:
                    err_line = str(exc).strip().splitlines()[0] if str(exc).strip() else type(exc).__name__
                    failures.append((table, err_line))
                    conn.rollback()
                finally:
                    cur.close()
    except Exception as exc:
        logger.warning("Permission probe could not run: %s", exc)
        return

    if not failures:
        logger.info("DB permission probe OK (%d critical tables readable)", len(_CRITICAL_TABLES))
        return

    bar = "=" * 72
    logger.error(bar)
    logger.error("DATABASE PERMISSION CHECK FAILED")
    logger.error("Backend connected, but the configured DB user cannot read:")
    for table, err in failures:
        logger.error("  - %s -> %s", table, err)
    logger.error("")
    logger.error("Most likely cause: tables were created by a DIFFERENT Postgres user")
    logger.error("(commonly `postgres` superuser) and the user in DATABASE_URL is")
    logger.error("neither the table owner nor has been granted access.")
    logger.error("")
    logger.error("Fix — connect as postgres superuser and run:")
    logger.error("  ALTER SCHEMA public OWNER TO <backend_user>;")
    logger.error("  DO $$ DECLARE r RECORD; BEGIN")
    logger.error("    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP")
    logger.error("      EXECUTE format('ALTER TABLE public.%I OWNER TO <backend_user>', r.tablename);")
    logger.error("    END LOOP;")
    logger.error("  END $$;")
    logger.error("  GRANT ALL ON ALL TABLES IN SCHEMA public TO <backend_user>;")
    logger.error("  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO <backend_user>;")
    logger.error(bar)


# Legacy alias
def close_db_connection():
    """Legacy alias for close_db"""
    pass


__all__ = [
    'get_db_connection',
    'get_db_connection_sync',
    'close_db_connection',
    'init_database',
    'close_db',
    'get_db_type',
    'is_postgres',
]
