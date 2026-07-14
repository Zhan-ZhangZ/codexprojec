from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tests.python.support.paths import add_repo_path

add_repo_path("skills/cad/scripts")

from cadpy import assembly_spec, catalog, generation, glb_topology, metadata, render, step_scene, step_targets
from tests.python.support.tmp_root import CAD_TEST_TMP_ROOT, temporary_directory


IGNORED_TEST_ROOT = CAD_TEST_TMP_ROOT


class IsolatedCadRoots:
    def __init__(self, testcase: unittest.TestCase, *, prefix: str) -> None:
        self._tempdir = temporary_directory(prefix=prefix)
        testcase.addCleanup(self._tempdir.cleanup)

        self.root = Path(self._tempdir.name)
        self.cad_root = self.root / "workspace"
        self.cad_root.mkdir(parents=True, exist_ok=True)

        patches = []
        for module in (
            assembly_spec,
            catalog,
            render,
            generation,
            glb_topology,
            metadata,
            step_scene,
            step_targets,
        ):
            if hasattr(module, "CAD_ROOT"):
                patches.append(mock.patch.object(module, "CAD_ROOT", self.cad_root))
            if hasattr(module, "REPO_ROOT"):
                patches.append(mock.patch.object(module, "REPO_ROOT", self.cad_root))
        for patcher in patches:
            patcher.start()
            testcase.addCleanup(patcher.stop)

    def temporary_cad_directory(self, *, prefix: str) -> tempfile.TemporaryDirectory[str]:
        return tempfile.TemporaryDirectory(prefix=prefix, dir=self.cad_root)
