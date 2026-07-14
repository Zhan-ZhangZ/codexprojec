import tg_mcp.tools  # noqa: F401
from tg_mcp.context import READ_TOOLS, WRITE_TOOLS
from tg_mcp.registry import registry


def test_all_mcp_wrapped_tools_are_registered():
    for tool_name in READ_TOOLS | WRITE_TOOLS:
        assert registry.get_tool(tool_name) is not None
