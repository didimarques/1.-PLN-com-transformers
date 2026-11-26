"""Real live multi-source web search & machine-readable page content extractor."""

import html as html_lib
import json
import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import httpx
from langchain_core.tools import tool

HTML_TAG_RE = re.compile(r"<[^>]+>")
BLOCK_STRIP_RE = re.compile(r"<(script|style|noscript|nav|header|footer|aside|svg|form)[^>]*>.*?</\1>", re.S | re.I)
JSON_LD_RE = re.compile(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S | re.I)
META_DESC_RE = re.compile(
    r'<meta[^>]+(?:name|property)=["\'](?:description|og:description|twitter:description)["\'][^>]+content=["\']([^"\']+)["\']',
    re.I,
)
META_TIME_RE = re.compile(
    r'<meta[^>]+(?:name|property)=["\'](?:article:published_time|article:modified_time|og:updated_time|pubdate)["\'][^>]+content=["\']([^"\']+)["\']',
    re.I,
)
ARTICLE_BODY_RE = re.compile(r"<(article|main)[^>]*>(.*?)</\1>", re.S | re.I)
WS_RE = re.compile(r"\s+")

STOPWORDS = {
    "quando", "será", "sera", "como", "qual", "quais", "para", "sobre",
    "onde", "quem", "porque", "por", "que", "com", "dos", "das", "nos", "nas",
    "uma", "uns", "umas", "proximo", "próximo", "proxima", "próxima", "mais",
    "pelo", "pela", "entre", "esta", "este", "isso", "aqui", "hoje",
}

TRUSTED_DOMAINS = (
    "gov.br", "bcb.gov.br", "ge.globo.com", "g1.globo.com", "uol.com.br",
    "espn.com.br", "cnnbrasil.com.br", "lance.com.br", "folha.uol.com.br",
    "estadao.com.br", "infomoney.com.br", "valor.globo.com", "bbc.com",
    "reuters.com", "flamengo.com.br", "cbf.com.br", "terra.com.br",
    "gazetaesportiva.com", "sofascore.com", "flashscore.com.br", "wikipedia.org",
)


def _domain_of(url: str) -> str:
    try:
        return urllib.parse.urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return ""


def _trust_score(url: str) -> int:
    dom = _domain_of(url)
    for idx, td in enumerate(TRUSTED_DOMAINS):
        if dom == td or dom.endswith("." + td):
            return 100 - idx
    return 10


def _unwrap_bing_url(url: str) -> str:
    if "bing.com/news/apiclick" in url or "bing.com/ck/a" in url:
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        if "url" in qs and qs["url"]:
            return qs["url"][0]
    return url


def _extract_json_ld_summary(raw_html: str) -> list[str]:
    """Extract structured machine-readable facts from JSON-LD scripts."""
    facts: list[str] = []
    for raw_json in JSON_LD_RE.findall(raw_html[:150000])[:4]:
        try:
            parsed = json.loads(html_lib.unescape(raw_json.strip()))
            items = parsed if isinstance(parsed, list) else [parsed]
            for obj in items:
                if not isinstance(obj, dict):
                    continue
                if "@graph" in obj and isinstance(obj["@graph"], list):
                    items.extend(x for x in obj["@graph"] if isinstance(x, dict))
                headline = obj.get("headline") or obj.get("name")
                desc = obj.get("description")
                body = obj.get("articleBody")
                date_pub = obj.get("datePublished") or obj.get("startDate")
                parts = []
                if headline:
                    parts.append(str(headline).strip())
                if date_pub:
                    parts.append(f"Data: {str(date_pub).strip()}")
                if desc:
                    parts.append(str(desc).strip())
                if body:
                    parts.append(str(body).strip()[:900])
                if parts:
                    facts.append("[JSON-LD] " + " | ".join(parts))
        except Exception:
            continue
    return facts


def _rank_text_passages(plain_text: str, query: str, extra_headers: list[str], max_chars: int = 3200) -> str:
    """Rank clean text lines/paragraphs by relevance to the query for machine reading."""
    is_table_query = bool(re.search(r"tabela|classifica[cç][aã]o|ranking|lista|completa|campeonato|rodada", query.lower()))
    if is_table_query:
        max_chars = max(max_chars, 5800)

    keywords = [
        w.lower()
        for w in re.findall(r"[\wÀ-ÿ]{3,}", query)
        if w.lower() not in STOPWORDS
    ]
    wants_date_or_time = bool(re.search(r"quando|data|hor[aá]rio|dia|horas|placar|pre[cç]o|valor|jogo", query.lower()))

    scored_blocks: list[tuple[float, int, str]] = []
    seen_lines: set[str] = set()

    for idx, raw_line in enumerate(plain_text.splitlines()):
        # Remove ruído de imagens markdown do Jina Reader (ex: [![Image 41: Team](url)]) mantendo o texto alt
        cleaned_line = re.sub(r"\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)", "", raw_line)
        cleaned_line = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", cleaned_line)
        line = WS_RE.sub(" ", cleaned_line).strip()
        is_table_row = ("|" in line and bool(re.search(r"\d", line))) or bool(re.match(r"^\d{1,2}[º°.\s]+\w+", line))

        min_len = 8 if is_table_row else 30
        if len(line) < min_len or len(line) > 950:
            continue
        if line in seen_lines:
            continue
        seen_lines.add(line)

        lower = line.lower()
        if any(noise in lower for noise in ("cookie", "política de privacidade", "aceitar todos", "assine já", "newsletter")):
            continue

        kw_hits = sum(1 for kw in keywords if kw in lower)
        score = float(kw_hits * 3.0)
        if is_table_row:
            score += 6.0 if is_table_query else 3.5
        if wants_date_or_time and re.search(r"\b\d{1,2}/\d{1,2}\b|\b\d{1,2}h\d{0,2}\b|\b\d{1,2}:\d{2}\b|\b(?:segunda|terça|quarta|quinta|sexta|sábado|domingo)\b", lower):
            score += 4.5
        if 55 <= len(line) <= 450:
            score += 1.0

        if keywords and kw_hits == 0 and score < 4.0 and not is_table_row:
            continue
        scored_blocks.append((score, idx, line))

    if is_table_query:
        # Preserva a ordem original das linhas da tabela para manter 1º..20º lugar intactos
        top_blocks = sorted(scored_blocks, key=lambda x: x[0], reverse=True)[:48]
        top_blocks.sort(key=lambda x: x[1])
    else:
        top_blocks = sorted(scored_blocks, key=lambda x: x[0], reverse=True)[:16]

    passages: list[str] = [h[:500] for h in extra_headers if h.strip()]
    total_len = sum(len(p) for p in passages)

    for _, _, block in top_blocks:
        if total_len + len(block) > max_chars:
            break
        passages.append(block)
        total_len += len(block)

    if len(passages) <= len(extra_headers):
        fallback = WS_RE.sub(" ", plain_text).strip()[:max_chars]
        if fallback:
            passages.append(fallback)

    return "\n".join(passages).strip()


def _extract_relevant_passages(raw_html: str, query: str, max_chars: int = 3200) -> str:
    """Extract structured JSON-LD, meta tags, main/article body, and rank passages."""
    headers_info = _extract_json_ld_summary(raw_html)
    meta_matches = META_DESC_RE.findall(raw_html[:35000])
    if meta_matches:
        meta_text = " | ".join(html_lib.unescape(m.strip()) for m in meta_matches if m.strip())
        if meta_text:
            headers_info.append(f"[Resumo] {meta_text[:400]}")

    time_matches = META_TIME_RE.findall(raw_html[:35000])
    if time_matches:
        headers_info.append(f"[Data publicada] {time_matches[0].strip()}")

    article_match = ARTICLE_BODY_RE.search(raw_html)
    target_html = article_match.group(2) if article_match else raw_html

    cleaned = BLOCK_STRIP_RE.sub("\n", target_html)
    cleaned = re.sub(r"</?(?:td|th)[^>]*>", " | ", cleaned, flags=re.I)
    cleaned = re.sub(r"</?(?:p|div|li|tr|h[1-6]|article|section|br)[^>]*>", "\n", cleaned, flags=re.I)
    text = HTML_TAG_RE.sub(" ", cleaned)
    text = html_lib.unescape(text)

    return _rank_text_passages(text, query, headers_info, max_chars=max_chars)


def _read_via_jina_reader(url: str, query: str, client: httpx.Client) -> str:
    """Fallback machine-readable extraction via Jina Reader (handles JS pages & Google News redirects)."""
    try:
        jina_url = f"https://r.jina.ai/{url}"
        resp = client.get(
            jina_url,
            headers={"Accept": "text/plain", "X-No-Cache": "true"},
            timeout=10.0,
            follow_redirects=True,
        )
        if resp.status_code != 200 or len(resp.text.strip()) < 80:
            return ""
        return _rank_text_passages(resp.text[:120000], query, [], max_chars=2400)
    except Exception:
        return ""


def _read_url_content(url: str, query: str, client: httpx.Client) -> str:
    """Fetch a live URL directly, falling back to Jina Reader for JS-rendered or blocked pages."""
    direct_content = ""
    if "news.google.com" not in url:
        try:
            resp = client.get(url, timeout=7.0, follow_redirects=True)
            ctype = resp.headers.get("content-type", "").lower()
            if resp.status_code == 200 and ("text/html" in ctype or "text/plain" in ctype or "xhtml" in ctype):
                direct_content = _extract_relevant_passages(resp.text[:550000], query)
        except Exception:
            direct_content = ""

    if len(direct_content) >= 220:
        return direct_content

    jina_content = _read_via_jina_reader(url, query, client)
    return jina_content or direct_content


@tool
def ler_pagina_web(url: str, foco: str = "") -> dict:
    """Acessa uma URL da web (incluindo páginas JS ou links de notícias) e lê os trechos relevantes para máquina."""
    if not url.startswith("http"):
        return {"erro": "URL inválida. Informe uma URL http/https."}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }
    with httpx.Client(headers=headers, follow_redirects=True) as client:
        conteudo = _read_url_content(url, foco or url, client)
    return {
        "fonte": f"Página Web ({_domain_of(url)})",
        "url": url,
        "conteudo_extraido": conteudo or "Não foi possível extrair texto legível desta página.",
    }


@tool
def web_search(query: str, max_results: int = 5) -> dict:
    """Pesquisa informações reais em múltiplas fontes diversas da web e LÊ o conteúdo completo das páginas."""
    today_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    tavily_key = os.getenv("TAVILY_API_KEY", "").strip()
    if tavily_key:
        try:
            resp = httpx.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": tavily_key,
                    "query": query,
                    "max_results": max_results,
                    "include_raw_content": True,
                },
                timeout=12.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "fonte": "Web Externa (Tavily + Leitura de Conteúdo)",
                "data_atual": today_str,
                "query": query,
                "resultados": [
                    {
                        "titulo": r.get("title", ""),
                        "url": r.get("url", ""),
                        "dominio": _domain_of(r.get("url", "")),
                        "resumo": r.get("content", "")[:500],
                        "conteudo_lido": (r.get("raw_content") or r.get("content") or "")[:2200],
                    }
                    for r in data.get("results", [])[:max_results]
                ],
            }
        except Exception as exc:
            return {"fonte": "Web Externa (Tavily)", "data_atual": today_str, "query": query, "erro": str(exc)}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }
    clean_query = re.sub(r"[?!\"']+", "", query).strip()
    clean_query = re.sub(r"\bsite:\S+", "", clean_query, flags=re.I).strip()
    clean_query = re.sub(r"\bOR\b", " ", clean_query).strip()
    clean_query = WS_RE.sub(" ", clean_query) or query.strip()
    encoded_q = urllib.parse.quote(clean_query)
    candidates: list[dict] = []

    with httpx.Client(headers=headers, follow_redirects=True) as client:
        # 1. DuckDuckGo Lite (busca web orgânica em sites diversos sem bloqueio JS)
        try:
            ddg_resp = client.get(
                f"https://lite.duckduckgo.com/lite/?q={encoded_q}&kl=br-pt",
                timeout=8.0,
            )
            if ddg_resp.status_code == 200:
                anchors = re.findall(
                    r'<a[^>]+href=["\']([^"\']+)["\'][^>]+class=["\']result-link["\'][^>]*>(.*?)</a>',
                    ddg_resp.text,
                    re.S | re.I,
                )
                if not anchors:
                    anchors = re.findall(
                        r'<a[^>]+class=["\']result-link["\'][^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
                        ddg_resp.text,
                        re.S | re.I,
                    )
                snippets = re.findall(
                    r'<td[^>]+class=["\']result-snippet["\'][^>]*>(.*?)</td>',
                    ddg_resp.text,
                    re.S | re.I,
                )
                for idx, (raw_href, raw_title) in enumerate(anchors[:8]):
                    url = html_lib.unescape(raw_href).strip()
                    if url.startswith("//"):
                        url = "https:" + url
                    if "duckduckgo.com/l/?" in url:
                        qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
                        if "uddg" in qs and qs["uddg"]:
                            url = qs["uddg"][0]
                    title = WS_RE.sub(" ", HTML_TAG_RE.sub(" ", html_lib.unescape(raw_title))).strip()
                    snip = WS_RE.sub(" ", HTML_TAG_RE.sub(" ", html_lib.unescape(snippets[idx]))).strip() if idx < len(snippets) else ""
                    if url.startswith("http") and "duckduckgo.com/y.js" not in url and "bing.com/aclick" not in url:
                        candidates.append({
                            "titulo": title,
                            "url": url,
                            "dominio": _domain_of(url),
                            "resumo_busca": snip[:450],
                            "publicado_em": "",
                            "origem": "DuckDuckGo Web",
                            "_score": _trust_score(url) + 35,
                        })
        except Exception:
            pass

        # 2. Bing News RSS (URLs diretas dos veículos de comunicação)
        try:
            bing_resp = client.get(
                f"https://www.bing.com/news/search?q={encoded_q}&format=rss",
                timeout=8.0,
            )
            if bing_resp.status_code == 200 and "<item>" in bing_resp.text:
                broot = ET.fromstring(bing_resp.text)
                for item in broot.findall(".//item")[:7]:
                    raw_url = (item.findtext("link") or "").strip()
                    url = _unwrap_bing_url(raw_url)
                    title = (item.findtext("title") or "").strip()
                    desc = HTML_TAG_RE.sub(" ", html_lib.unescape(item.findtext("description") or "")).strip()
                    pub_date = (item.findtext("pubDate") or "").strip()
                    if url.startswith("http") and title:
                        candidates.append({
                            "titulo": title,
                            "url": url,
                            "dominio": _domain_of(url),
                            "resumo_busca": WS_RE.sub(" ", desc)[:450],
                            "publicado_em": pub_date,
                            "origem": "Bing News RSS",
                            "_score": _trust_score(url) + 25,
                        })
        except Exception:
            pass

        # 3. Google News RSS (notícias recentes + resolução via Jina Reader se necessário)
        try:
            gnews_resp = client.get(
                f"https://news.google.com/rss/search?q={encoded_q}&hl=pt-BR&gl=BR&ceid=BR:pt-419",
                timeout=8.0,
            )
            if gnews_resp.status_code == 200 and "<item>" in gnews_resp.text:
                groot = ET.fromstring(gnews_resp.text)
                for item in groot.findall(".//item")[:6]:
                    url = (item.findtext("link") or "").strip()
                    title = (item.findtext("title") or "").strip()
                    source = (item.findtext("source") or "Google News").strip()
                    pub_date = (item.findtext("pubDate") or "").strip()
                    if title:
                        candidates.append({
                            "titulo": title,
                            "url": url,
                            "dominio": source,
                            "resumo_busca": f"[{source} - {pub_date}] {title}",
                            "publicado_em": pub_date,
                            "origem": f"Google News ({source})",
                            "_score": _trust_score(url) + 10,
                        })
        except Exception:
            pass

        # 4. Wikipedia PT API (apoio enciclopédico/factual)
        try:
            wiki_resp = client.get(
                f"https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch={encoded_q}&format=json&srlimit=2",
                timeout=6.0,
            )
            if wiki_resp.status_code == 200:
                for witem in wiki_resp.json().get("query", {}).get("search", []):
                    wtitle = witem.get("title", "")
                    wsnip = WS_RE.sub(" ", HTML_TAG_RE.sub(" ", witem.get("snippet", ""))).strip()
                    wurl = f"https://pt.wikipedia.org/wiki/{urllib.parse.quote(wtitle.replace(' ', '_'))}"
                    candidates.append({
                        "titulo": f"{wtitle} — Wikipédia",
                        "url": wurl,
                        "dominio": "pt.wikipedia.org",
                        "resumo_busca": wsnip[:450],
                        "publicado_em": "",
                        "origem": "Wikipedia PT",
                        "_score": 35,
                    })
        except Exception:
            pass

        # Ordena por confiabilidade e garante diversidade de domínios
        candidates.sort(key=lambda x: x["_score"], reverse=True)
        diverse: list[dict] = []
        seen_domains: set[str] = set()
        for c in candidates:
            dom = c["dominio"]
            if dom in seen_domains and len(diverse) < max_results:
                continue
            seen_domains.add(dom)
            diverse.append(c)
            if len(diverse) >= max_results:
                break

        # LÊ o conteúdo real das top 4 páginas encontradas (com fallback Jina Reader para JS/redirects)
        pages_read = 0
        for item in diverse:
            if pages_read >= 4:
                break
            if item["url"].startswith("http"):
                content = _read_url_content(item["url"], clean_query, client)
                if content:
                    item["conteudo_lido"] = content
                    pages_read += 1

    clean_results = [{k: v for k, v in r.items() if k != "_score"} for r in diverse]

    return {
        "fonte": "Web Externa (Multi-Buscador + Leitura Estruturada de Páginas)",
        "data_atual": today_str,
        "query": query,
        "paginas_lidas": pages_read,
        "total_fontes_distintas": len({r["dominio"] for r in clean_results}),
        "resultados": clean_results,
    }
