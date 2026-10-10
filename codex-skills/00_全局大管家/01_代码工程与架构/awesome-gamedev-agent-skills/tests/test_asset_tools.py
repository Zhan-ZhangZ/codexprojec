"""End-to-end tests for the create-game-assets raster helpers."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

try:  # Pillow is only needed by the bundled asset helpers, not the validator.
    from PIL import Image, ImageDraw

    PILLOW_AVAILABLE = True
except ModuleNotFoundError:  # pragma: no cover - exercised on machines without Pillow
    Image = ImageDraw = None
    PILLOW_AVAILABLE = False


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "skills" / "disciplines" / "create-game-assets" / "scripts" / "asset_report.py"
PREVIEW = ROOT / "skills" / "disciplines" / "create-game-assets" / "scripts" / "build_preview_sheet.py"


@unittest.skipUnless(
    PILLOW_AVAILABLE,
    "Pillow is not installed; run "
    "pip install -r skills/disciplines/create-game-assets/scripts/requirements.txt",
)
class AssetToolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.asset = self.root / "sprite.png"
        image = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        ImageDraw.Draw(image).rectangle((4, 3, 11, 14), fill=(220, 70, 90, 255))
        image.save(self.asset)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def run_tool(self, script: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(script), *args],
            check=False,
            capture_output=True,
            text=True,
        )

    def test_asset_report_passes_and_emits_json(self) -> None:
        result = self.run_tool(
            REPORT,
            str(self.asset),
            "--expect-size",
            "16x16",
            "--require-alpha",
            "--max-colors",
            "4",
            "--json",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["assets"][0]["content_bounds"], [4, 3, 12, 15])

    def test_asset_report_fails_a_constraint(self) -> None:
        result = self.run_tool(REPORT, str(self.asset), "--expect-size", "32x32")

        self.assertEqual(result.returncode, 1)
        self.assertIn("expected 32x32", result.stdout)

    def test_preview_sheet_is_created(self) -> None:
        output = self.root / "preview.png"
        result = self.run_tool(
            PREVIEW,
            str(self.asset),
            "--out",
            str(output),
            "--columns",
            "1",
            "--cell-size",
            "64",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        with Image.open(output) as image:
            self.assertEqual(image.size, (88, 112))


if __name__ == "__main__":
    unittest.main()
