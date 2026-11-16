"""Short-term and long-term conversation memory management."""


class MemoryStore:
    """Stores and retrieves conversation context."""

    def __init__(self) -> None:
        self._sessions: dict[str, list[dict]] = {}

    def add_message(self, session_id: str, role: str, content: str) -> None:
        self._sessions.setdefault(session_id, []).append({"role": role, "content": content})

    def get_messages(self, session_id: str) -> list[dict]:
        return self._sessions.get(session_id, [])
