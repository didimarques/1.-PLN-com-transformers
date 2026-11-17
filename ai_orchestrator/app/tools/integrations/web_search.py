"""Real live web search tool using Tavily (if configured) or Wikipedia/DuckDuckGo APIs."""

import os
import re
import httpx
from langchain_core.tools import tool

HTML_TAG_RE = re.compile(r"<[^>]+>")


@tool
def web_search(query: str, max_results: int = 5) -> dict:
    """Pesquisa informações reais e atualizadas na internet (fonte externa)."""
    tavily_key = os.getenv("TAVILY_API_KEY", "").strip()
    if tavily_key:
        try:
            resp = httpx.post(
                "https://api.tavily.com/search",
                json={"api_key": tavily_key, "query": query, "max_results": max_results},
                timeout=12.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "fonte": "Web Externa (Tavily)",
                "query": query,
                "resultados": [
                    {
                        "titulo": r.get("title", ""),
                        "url": r.get("url", ""),
                        "resumo": r.get("content", "")[:400],
                    }
                    for r in data.get("results", [])[:max_results]
                ],
            }
        except Exception as exc:
            return {"fonte": "Web Externa (Tavily)", "query": query, "erro": str(exc)}

    # Busca real aberta via Wikipedia API (PT-BR) + DuckDuckGo Instant Answer
    results: list[dict] = []
    headers = {"User-Agent": "AIOrchestrator/1.0 (educational project)"}

    try:
        wiki_resp = httpx.get(
            "https://pt.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": max_results,
                "format": "json",
            },
            headers=headers,
            timeout=10.0,
        )
        wiki_resp.raise_for_status()
        hits = wiki_resp.json().get("query", {}).get("search", [])
        for h in hits:
            title = h.get("title", "")
            snippet = HTML_TAG_RE.sub("", h.get("snippet", ""))
            results.append({
                "titulo": title,
                "url": f"https://pt.wikipedia.org/wiki/{title.replace(' ', '_')}",
                "resumo": snippet,
            })
    except Exception as exc:
        return {"fonte": "Web Externa (Wikipedia/DDG)", "query": query, "erro": str(exc)}

    if not results:
        try:
            ddg = httpx.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
                headers=headers,
                timeout=10.0,
            ).json()
            if ddg.get("AbstractText"):
                results.append({
                    "titulo": ddg.get("Heading") or query,
                    "url": ddg.get("AbstractURL") or "https://duckduckgo.com",
                    "resumo": ddg["AbstractText"][:400],
                })
        except Exception:
            pass

    return {
        "fonte": "Web Externa (Pesquisa Live)",
        "query": query,
        "resultados": results[:max_results],
    }
