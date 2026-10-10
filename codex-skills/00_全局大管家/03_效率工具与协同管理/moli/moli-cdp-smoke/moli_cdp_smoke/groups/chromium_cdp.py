from __future__ import annotations

from . import SmokeState
from .chromium_cdp_dom import run_dom_group, run_computed_style_samples
from .chromium_cdp_frames import run_frame_group
from .chromium_cdp_network import run_network_group
from .chromium_cdp_page import run_page_manifest_and_layout, run_idle_override
from .chromium_cdp_performance import run_performance_group
from .chromium_cdp_runtime import (
    run_audits_sample,
    run_runtime_sample,
    run_input_sample,
    run_log_sample,
    run_io_blob_sample,
)


async def run_chromium_cdp_group(state: SmokeState) -> None:
    await run_network_group(state)
    await run_frame_group(state)
    await run_audits_sample(state)
    await run_page_manifest_and_layout(state)
    await run_runtime_sample(state)
    await run_input_sample(state)
    await run_idle_override(state)
    await run_log_sample(state)
    await run_io_blob_sample(state)
    await run_performance_group(state)
    await run_dom_group(state)


async def run_computed_style_group(state: SmokeState) -> None:
    """Run the focused cross-engine computed-style breadth contract."""
    await run_computed_style_samples(state)
