from dataclasses import dataclass
from typing import Any, Callable

from .permissions import PermissionLevel


@dataclass
class ToolDefinition:
    name: str
    description: str
    permission: PermissionLevel
    parameters: dict[str, Any]
    fn: Callable


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(
        self,
        name: str,
        description: str,
        permission: PermissionLevel,
        parameters: dict[str, Any],
    ):
        def decorator(fn: Callable):
            self._tools[name] = ToolDefinition(name, description, permission, parameters, fn)
            return fn

        return decorator

    def get_tool(self, name: str) -> ToolDefinition | None:
        return self._tools.get(name)


registry = ToolRegistry()
