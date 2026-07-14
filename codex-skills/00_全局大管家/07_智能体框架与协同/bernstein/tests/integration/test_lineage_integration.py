"""Integration test: single-task lineage emission walks back to its agent.

Simulates the WAL surface produced by one task being executed by an
agent that lands a single file write. Verifies that:

1. The emitted lineage record points back to the correct agent + prompt.
2. The CLI's lookup helper returns the chain in <500 ms.
3. WAL hash chain integrity holds across mixed (lineage / non-lineage)
   decision types.
"""

from __future__ import annotations

import time
from pathlib import Path

from bernstein.core.persistence.lineage import (
    AgentRef,
    ArtifactRef,
    LineageReader,
    LineageRecord,
    LineageWriter,
    hash_file,
)
from bernstein.core.persistence.wal import WALReader, WALWriter


def test_single_task_plan_emits_lineage_record(tmp_path: Path) -> None:
    """Mimics one task: orchestrator writes WAL events; agent emits lineage."""
    sdd = tmp_path / ".sdd"
    sdd.mkdir()
    run_id = "run-integration"

    # Simulate the orchestrator writing tick / spawn events.
    wal = WALWriter(run_id=run_id, sdd_dir=sdd)
    wal.append(decision_type="tick_start", inputs={}, output={"tick": 0}, actor="orchestrator")
    wal.append(
        decision_type="task_spawn_confirmed",
        inputs={"task_id": "t-1", "agent_id": "agent-1"},
        output={"pid": 4242},
        actor="orchestrator",
    )

    # Simulate the agent writing a file and emitting a lineage record.
    workfile = tmp_path / "src" / "feature.py"
    workfile.parent.mkdir(parents=True)
    workfile.write_text("def hello():\n    return 'world'\n")
    file_sha = hash_file(workfile)
    assert file_sha

    input_file = tmp_path / "spec" / "feature.md"
    input_file.parent.mkdir(parents=True)
    input_file.write_text("# Feature spec\n")
    input_sha = hash_file(input_file)

    prompt_sha = "deadbeef" * 8  # 64 chars
    record = LineageRecord(
        output_artifact=ArtifactRef(
            path="src/feature.py",
            sha256=file_sha,
            line_start=1,
            line_end=2,
        ),
        inputs=[ArtifactRef(path="spec/feature.md", sha256=input_sha)],
        producer=AgentRef(agent_id="agent-1", run_id=run_id, tick_id="0"),
        prompt_sha=prompt_sha,
        model="claude-sonnet",
        cost_usd=0.005,
        tokens=320,
        timestamp=time.time(),
    )
    LineageWriter(wal).emit(record)

    # Acceptance: the artifact has at least one LineageRecord pointing
    # back to its agent + prompt.
    reader = LineageReader(sdd)
    found = reader.lookup("src/feature.py", line=1)
    assert len(found) == 1
    assert found[0].producer.agent_id == "agent-1"
    assert found[0].producer.run_id == run_id
    assert found[0].prompt_sha == prompt_sha
    assert [a.path for a in found[0].inputs] == ["spec/feature.md"]


def test_lookup_completes_quickly(tmp_path: Path) -> None:
    """Acceptance: lookup returns in <500 ms for a 1k-record WAL."""
    sdd = tmp_path / ".sdd"
    sdd.mkdir()
    writer = LineageWriter.for_run("run-perf", sdd)
    for i in range(1000):
        writer.emit(
            LineageRecord(
                output_artifact=ArtifactRef(
                    path=f"src/f{i % 50}.py",
                    sha256="a" * 64,
                    line_start=1,
                    line_end=10,
                ),
                inputs=[],
                producer=AgentRef(agent_id=f"agent-{i % 4}", run_id="run-perf"),
                prompt_sha="b" * 64,
                model="m",
                timestamp=float(i),
            )
        )
    reader = LineageReader(sdd)
    t0 = time.perf_counter()
    rows = reader.lookup("src/f7.py", line=5)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    assert rows
    assert elapsed_ms < 500, f"lookup took {elapsed_ms:.1f} ms"


def test_hmac_chain_intact_with_lineage_records(tmp_path: Path) -> None:
    """Acceptance: WAL hash chain still verifies after lineage records."""
    sdd = tmp_path / ".sdd"
    sdd.mkdir()
    run_id = "run-chain"
    wal = WALWriter(run_id=run_id, sdd_dir=sdd)
    lineage = LineageWriter(wal)

    wal.append(decision_type="tick_start", inputs={}, output={}, actor="orch")
    lineage.emit(
        LineageRecord(
            output_artifact=ArtifactRef(path="x.py", sha256="a" * 64),
            inputs=[],
            producer=AgentRef(agent_id="agent-1", run_id=run_id),
            prompt_sha="p",
        )
    )
    wal.append(decision_type="task_completed", inputs={}, output={}, actor="orch")
    lineage.emit(
        LineageRecord(
            output_artifact=ArtifactRef(path="y.py", sha256="b" * 64),
            inputs=[ArtifactRef(path="x.py", sha256="a" * 64)],
            producer=AgentRef(agent_id="agent-1", run_id=run_id),
            prompt_sha="p",
        )
    )

    reader = WALReader(run_id=run_id, sdd_dir=sdd)
    ok, errors = reader.verify_chain()
    assert ok, errors
