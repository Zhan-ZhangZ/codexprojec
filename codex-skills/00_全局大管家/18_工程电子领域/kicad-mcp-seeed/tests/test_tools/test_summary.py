"""Tests for schematic summarization tools."""

import pytest
from pathlib import Path

from kicad_mcp_server.tools import summary


@pytest.fixture
def example_schematic():
    """Path to example schematic file."""
    return Path(__file__).parent.parent / "fixtures" / "example_schematic.kicad_sch"


class TestSummaryTools:
    """Test summary tool functions."""

    @pytest.mark.asyncio
    async def test_summarize_schematic(self, example_schematic):
        """Test summarize_schematic tool."""
        result = await summary.summarize_schematic(
            str(example_schematic),
            detail_level="standard",
            include_nets=True,
            include_power=True,
        )

        assert "Schematic Summary" in result
        assert "Example Project" in result
        assert "Components by Type" in result
        assert "Integrated Circuits" in result

    @pytest.mark.asyncio
    async def test_analyze_functional_blocks(self, example_schematic):
        """Test analyze_functional_blocks tool."""
        result = await summary.analyze_functional_blocks(str(example_schematic))

        assert "Functional Block Analysis" in result
        assert "Microcontroller" in result
