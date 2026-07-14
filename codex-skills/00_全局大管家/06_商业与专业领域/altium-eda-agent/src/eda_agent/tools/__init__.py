# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>
"""MCP Tools for Altium Designer.

Error-shape convention (two families, consistent within each):

- Bridge-backed tools (anything that round-trips Altium) report failures as
  ``{"error": "<message>", <count_field>: 0, ...}`` -- or raise, in which
  case the MCP layer surfaces the exception text. Successful payloads come
  from the Pascal handler verbatim.
- Offline calculators (``pcb_calc_*``, ``design_compute_*``, exporters)
  report ``{"ok": False, "reason": "<message>"}`` and ``{"ok": True, ...}``
  on success.

New tools should match the family they belong to rather than invent a third
shape.
"""

from .application import register_application_tools
from .project import register_project_tools
from .library import register_library_tools
from .generic import register_generic_tools
from .pcb import register_pcb_tools
from .review import register_review_tools
from .sim import register_sim_tools
from .design import register_design_tools
from .render import register_render_tools
from .audit import register_audit_tools
from .route import register_route_tools


def register_all_tools(mcp):
    """Register all Altium tools with the MCP server."""
    register_application_tools(mcp)
    register_project_tools(mcp)
    register_library_tools(mcp)
    register_generic_tools(mcp)
    register_pcb_tools(mcp)
    register_review_tools(mcp)
    register_sim_tools(mcp)
    register_design_tools(mcp)
    register_render_tools(mcp)
    register_audit_tools(mcp)
    register_route_tools(mcp)


__all__ = [
    "register_all_tools",
    "register_application_tools",
    "register_project_tools",
    "register_library_tools",
    "register_generic_tools",
    "register_pcb_tools",
    "register_review_tools",
    "register_sim_tools",
    "register_design_tools",
    "register_render_tools",
    "register_audit_tools",
    "register_route_tools",
]
