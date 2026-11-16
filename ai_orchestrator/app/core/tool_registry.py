"""Central registry for agent tools."""


class ToolRegistry:
    """Registers and resolves callable tools by name."""

    def __init__(self) -> None:
        self._tools = {}

    def register(self, name: str, tool) -> None:
        self._tools[name] = tool

    def get(self, name: str):
        return self._tools.get(name)

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())
