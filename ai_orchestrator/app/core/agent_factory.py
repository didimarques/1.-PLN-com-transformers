"""Factory for instantiating configured AI agents."""


class AgentFactory:
    """Creates agents by role or name."""

    @staticmethod
    def create(agent_type: str, **kwargs):
        raise NotImplementedError(f"Agent type '{agent_type}' not registered yet.")
