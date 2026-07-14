"""Unit tests for the per-artifact lineage trail."""

from __future__ import annotations

import gzip
import hashlib
from pathlib import Path

from bernstein.core.persistence.lineage import (
    LINEAGE_DECISION_TYPE,
    AgentRef,
    ArtifactRef,
    LineageReader,
    LineageRecord,
    LineageWriter,
    bundle_records_to_jsonl,
    collect_bundle_records,
    compress_rotated_lineage,
    hash_file,
)
from bernstein.core.persistence.wal import WALReader


def _sdd(tmp_path: Path) -> Path:
    sdd = tmp_path / ".sdd"
    sdd.mkdir(exist_ok=True)
    return sdd


# ---------------------------------------------------------------------------
# ArtifactRef
# ---------------------------------------------------------------------------


class TestArtifactRef:
    def test_covers_line_within_range(self) -> None:
        ref = ArtifactRef(path="x.py", sha256="ab", line_start=5, line_end=10)
        assert ref.covers_line(5)
        assert ref.covers_line(7)
        assert ref.covers_line(10)

    def test_covers_line_outside_range(self) -> None:
        ref = ArtifactRef(path="x.py", sha256="ab", line_start=5, line_end=10)
        assert not ref.covers_line(4)
        assert not ref.covers_line(11)

    def test_covers_line_unset_bounds_match_any(self) -> None:
        ref = ArtifactRef(path="x.py", sha256="ab")
        assert ref.covers_line(1)
        assert ref.covers_line(99999)


# ---------------------------------------------------------------------------
# hash_file
# ---------------------------------------------------------------------------


class TestHashFile:
    def test_hashes_file_contents(self, tmp_path: Path) -> None:
        target = tmp_path / "x.txt"
        target.write_text("hello world")
        expected = hashlib.sha256(b"hello world").hexdigest()
        assert hash_file(target) == expected

    def test_missing_file_returns_empty(self, tmp_path: Path) -> None:
        assert hash_file(tmp_path / "nope") == ""


# ---------------------------------------------------------------------------
# LineageWriter / LineageReader round trip
# ---------------------------------------------------------------------------


def _make_record(path: str = "src/foo.py") -> LineageRecord:
    return LineageRecord(
        output_artifact=ArtifactRef(
            path=path,
            sha256="a" * 64,
            line_start=10,
            line_end=20,
        ),
        inputs=[ArtifactRef(path="src/bar.py", sha256="b" * 64)],
        producer=AgentRef(agent_id="agent-1", run_id="run-1", tick_id="t-3"),
        prompt_sha="c" * 64,
        model="claude-sonnet",
        cost_usd=0.0125,
        tokens=1500,
        timestamp=1700000000.0,
    )


class TestLineageWriter:
    def test_emit_appends_record_to_wal(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        writer = LineageWriter.for_run("run-1", sdd)
        record = _make_record()

        writer.emit(record)

        reader = WALReader(run_id="run-1", sdd_dir=sdd)
        entries = list(reader.iter_entries())
        assert len(entries) == 1
        assert entries[0].decision_type == LINEAGE_DECISION_TYPE
        assert entries[0].actor == "agent-1"

    def test_round_trip_preserves_all_fields(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        writer = LineageWriter.for_run("run-1", sdd)
        record = _make_record()
        writer.emit(record)

        reader = LineageReader(sdd)
        rows = reader.lookup("src/foo.py")
        assert len(rows) == 1
        roundtripped = rows[0]
        assert roundtripped.output_artifact.path == record.output_artifact.path
        assert roundtripped.output_artifact.sha256 == record.output_artifact.sha256
        assert roundtripped.output_artifact.line_start == 10
        assert roundtripped.output_artifact.line_end == 20
        assert [a.path for a in roundtripped.inputs] == ["src/bar.py"]
        assert roundtripped.producer == record.producer
        assert roundtripped.prompt_sha == record.prompt_sha
        assert roundtripped.model == record.model
        assert roundtripped.cost_usd == record.cost_usd
        assert roundtripped.tokens == record.tokens

    def test_emit_preserves_wal_hash_chain(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        # Mix non-lineage WAL writes with lineage emissions through ONE
        # writer instance to make sure the chain stays continuous across
        # decision types.
        from bernstein.core.persistence.wal import WALWriter

        wal_writer = WALWriter(run_id="run-1", sdd_dir=sdd)
        lineage = LineageWriter(wal_writer)
        wal_writer.append(decision_type="tick_start", inputs={}, output={}, actor="orch")
        lineage.emit(_make_record())
        wal_writer.append(decision_type="task_completed", inputs={}, output={}, actor="orch")
        lineage.emit(_make_record(path="src/baz.py"))

        reader = WALReader(run_id="run-1", sdd_dir=sdd)
        ok, errors = reader.verify_chain()
        assert ok, errors


class TestLineageReaderLookup:
    def test_filters_by_path(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        writer = LineageWriter.for_run("run-1", sdd)
        writer.emit(_make_record(path="src/foo.py"))
        writer.emit(_make_record(path="src/bar.py"))

        reader = LineageReader(sdd)
        foo = reader.lookup("src/foo.py")
        assert len(foo) == 1
        assert foo[0].output_artifact.path == "src/foo.py"

    def test_filters_by_line(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        writer = LineageWriter.for_run("run-1", sdd)
        record_a = LineageRecord(
            output_artifact=ArtifactRef(path="src/foo.py", sha256="a", line_start=1, line_end=5),
            inputs=[],
            producer=AgentRef(agent_id="a", run_id="r"),
        )
        record_b = LineageRecord(
            output_artifact=ArtifactRef(path="src/foo.py", sha256="b", line_start=10, line_end=20),
            inputs=[],
            producer=AgentRef(agent_id="b", run_id="r"),
        )
        writer.emit(record_a)
        writer.emit(record_b)

        reader = LineageReader(sdd)
        line_3 = reader.lookup("src/foo.py", line=3)
        line_15 = reader.lookup("src/foo.py", line=15)
        line_99 = reader.lookup("src/foo.py", line=99)
        assert {r.output_artifact.sha256 for r in line_3} == {"a"}
        assert {r.output_artifact.sha256 for r in line_15} == {"b"}
        assert line_99 == []

    def test_walks_multiple_runs(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        LineageWriter.for_run("run-1", sdd).emit(_make_record(path="src/foo.py"))
        LineageWriter.for_run("run-2", sdd).emit(_make_record(path="src/foo.py"))
        reader = LineageReader(sdd)
        assert len(reader.lookup("src/foo.py")) == 2
        assert len(reader.lookup("src/foo.py", run_id="run-1")) == 1


# ---------------------------------------------------------------------------
# Compaction
# ---------------------------------------------------------------------------


class TestCompactRotatedLineage:
    def test_compresses_rotated_files_only(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        wal_dir = sdd / "runtime" / "wal"
        wal_dir.mkdir(parents=True)
        active = wal_dir / "run-1.wal.jsonl"
        rotated = wal_dir / "run-1.wal.jsonl.1"
        active.write_text('{"seq": 0}\n')
        rotated.write_text('{"seq": 0}\n')

        compressed = compress_rotated_lineage(sdd)

        assert compressed == ["run-1.wal.jsonl.1"]
        assert active.exists()
        assert not rotated.exists()
        gz = wal_dir / "run-1.wal.jsonl.1.gz"
        assert gz.exists()
        with gzip.open(gz, "rb") as f:
            assert f.read() == b'{"seq": 0}\n'

    def test_no_op_when_already_compressed(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        wal_dir = sdd / "runtime" / "wal"
        wal_dir.mkdir(parents=True)
        gz = wal_dir / "run-1.wal.jsonl.1.gz"
        gz.write_bytes(b"already")
        compressed = compress_rotated_lineage(sdd)
        assert compressed == []


# ---------------------------------------------------------------------------
# Bundle helpers
# ---------------------------------------------------------------------------


class TestBundleHelpers:
    def test_collect_bundle_records_returns_dicts(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        LineageWriter.for_run("run-1", sdd).emit(_make_record())
        records = collect_bundle_records(sdd)
        assert len(records) == 1
        assert records[0]["output_artifact"]["path"] == "src/foo.py"
        assert records[0]["producer"]["agent_id"] == "agent-1"

    def test_bundle_records_to_jsonl_round_trip(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        LineageWriter.for_run("run-1", sdd).emit(_make_record())
        records = collect_bundle_records(sdd)
        jsonl = bundle_records_to_jsonl(records)
        assert jsonl.endswith("\n")
        # One line per record
        assert len([line for line in jsonl.splitlines() if line]) == len(records)

    def test_bundle_records_truncate_to_max(self, tmp_path: Path) -> None:
        sdd = _sdd(tmp_path)
        writer = LineageWriter.for_run("run-1", sdd)
        for i in range(7):
            writer.emit(_make_record(path=f"src/f{i}.py"))
        records = collect_bundle_records(sdd, max_records=3)
        assert len(records) == 3
        # Newest kept (chronological order from WAL).
        assert [r["output_artifact"]["path"] for r in records] == ["src/f4.py", "src/f5.py", "src/f6.py"]
