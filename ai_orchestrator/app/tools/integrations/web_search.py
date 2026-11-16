"""Web search tool integration using Tavily."""

try:
    from langchain_community.tools.tavily_search import TavilySearchResults

    web_search = TavilySearchResults(max_results=5)
except Exception:
    from langchain.tools import tool

    @tool
    def web_search(query: str) -> str:
        """Pesquisa informações externas na internet (requer tavily-python e TAVILY_API_KEY)."""
        return f"TavilySearchResults indisponível no ambiente para a consulta: '{query}'."
