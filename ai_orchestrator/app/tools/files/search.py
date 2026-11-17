"""Real semantic chunking and cosine-similarity search across files in storage/."""

import math
import re
from collections import Counter
from pathlib import Path
from langchain_core.tools import tool

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage"
TOKEN_RE = re.compile(r"[\wÀ-ÿ]+", re.UNICODE)


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in TOKEN_RE.findall(text) if len(t) > 1]


def _cosine_sim(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0
    common = set(a.keys()) & set(b.keys())
    dot = sum(a[k] * b[k] for k in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _extract_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        if PdfReader is None:
            return ""
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return path.read_text(encoding="utf-8", errors="replace")


@tool
def buscar_em_arquivos(consulta: str, top_k: int = 3) -> dict:
    """Pesquisa semanticamente em arquivos reais da pasta storage/ dividindo em chunks e ranqueando por similaridade."""
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    q_vec = Counter(_tokenize(consulta))
    scored_chunks: list[dict] = []
    scanned_files: list[str] = []

    for path in sorted(STORAGE_ROOT.iterdir()):
        if not path.is_file() or path.suffix.lower() not in {".txt", ".md", ".csv", ".json", ".pdf"}:
            continue
        scanned_files.append(path.name)
        content = _extract_text(path)
        if not content.strip():
            continue

        # Divisão em chunks de ~350 caracteres respeitando quebras de linha
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        for idx, chunk in enumerate(paragraphs, start=1):
            c_vec = Counter(_tokenize(chunk))
            sim = _cosine_sim(q_vec, c_vec)
            # Pequeno bônus para correspondência exata de termos
            overlap = sum(1 for k in q_vec if k in c_vec)
            score = min(0.99, sim * 0.75 + (overlap / max(1, len(q_vec))) * 0.25)
            scored_chunks.append({
                "arquivo": path.name,
                "chunk_id": idx,
                "similaridade": round(score * 100, 1),
                "trecho": chunk[:500],
            })

    scored_chunks.sort(key=lambda x: x["similaridade"], reverse=True)
    return {
        "fonte": "Arquivos Locais (storage/) + Busca por Chunks",
        "arquivos_analisados": scanned_files,
        "total_chunks": len(scored_chunks),
        "resultados": scored_chunks[:top_k],
    }
