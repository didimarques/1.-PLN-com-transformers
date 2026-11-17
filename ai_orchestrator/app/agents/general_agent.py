"""General-purpose operational agent with real database, files, API, web and process tools."""

from app.services.orchestrator import ALL_TOOLS, SYSTEM_PROMPT, run_langchain_flow

tools = ALL_TOOLS


def invoke_agent(query: str, mode: str = "auto", session_id: str = "cli") -> dict:
    """Invoke the LangChain orchestrated agent with real tool calling."""
    return run_langchain_flow(query=query, mode=mode, session_id=session_id)
