import textwrap
import unittest
from pathlib import Path

from cadpy import catalog as cad_catalog
from cadpy import generation as cad_generation
from cadpy.metadata import parse_generator_metadata
from tests.python.support.tmp_root import temporary_directory

STANDALONE_DXF_SOURCE = textwrap.dedent(
    '''
    """Standalone DXF drafting source."""

    import ezdxf


    def gen_dxf():
        doc = ezdxf.new()
        msp = doc.modelspace()
        msp.add_lwpolyline([(0, 0), (40, 0), (40, 20), (0, 20)], close=True)
        return doc
    '''
).strip()


def _write_standalone_source(root: Path, stem: str = "outline") -> Path:
    script_path = root / f"{stem}.py"
    script_path.write_text(STANDALONE_DXF_SOURCE + "\n")
    return script_path


class StandaloneDxfSourceTests(unittest.TestCase):
    def test_metadata_allows_gen_dxf_without_gen_step(self) -> None:
        with temporary_directory(prefix="dxf-skill") as root:
            script_path = _write_standalone_source(Path(root))
            metadata = parse_generator_metadata(script_path)

        assert metadata is not None
        self.assertTrue(metadata.has_gen_dxf)
        self.assertFalse(metadata.has_gen_step)
        self.assertIsNone(metadata.kind)

    def test_metadata_still_requires_gen_step_for_urdf_and_sdf(self) -> None:
        with temporary_directory(prefix="dxf-skill") as root:
            script_path = Path(root) / "robot.py"
            script_path.write_text("def gen_urdf():\n    return '<robot/>'\n")
            with self.assertRaisesRegex(ValueError, "require gen_step"):
                parse_generator_metadata(script_path)

    def test_explicit_target_resolves_dxf_only_source(self) -> None:
        with temporary_directory(prefix="dxf-skill") as root:
            script_path = _write_standalone_source(Path(root))
            source = cad_catalog.source_from_path(script_path)

            assert source is not None
            self.assertEqual("dxf", source.kind)
            self.assertIsNone(source.step_path)
            self.assertEqual(script_path.with_suffix(".dxf"), source.dxf_path)

    def test_directory_catalog_skips_dxf_only_source(self) -> None:
        with temporary_directory(prefix="dxf-skill") as root:
            _write_standalone_source(Path(root))
            self.assertEqual((), cad_catalog.iter_cad_sources(Path(root)))

    def test_generate_dxf_targets_writes_sibling_output(self) -> None:
        with temporary_directory(prefix="dxf-skill") as root:
            script_path = _write_standalone_source(Path(root))

            self.assertEqual(0, cad_generation.generate_dxf_targets([str(script_path)]))

            output_path = script_path.with_suffix(".dxf")
            self.assertTrue(output_path.exists())
            self.assertGreater(output_path.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
