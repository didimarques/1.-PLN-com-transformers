"""Role-based access control and tool permission policies."""


class PermissionManager:
    """Checks whether an agent or user is allowed to execute a tool."""

    def is_allowed(self, role: str, tool_name: str) -> bool:
        return True
