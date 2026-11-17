"""Real file reading utilities for authorized documents inside storage/."""

from pathlib import Path
from langchain_core.tools import tool

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage"


@tool
def ler_arquivo(caminho: str) -> str:
    """Lê o conteúdo real de um arquivo autorizado (.txt, .md, .csv, .json, .pdf) dentro de storage/."""
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    raw_path = Path(caminho)
    target = (STORAGE_ROOT / raw_path).resolve() if not raw_path.is_absolute() else raw_path.resolve()

    if not str(target).startswith(str(STORAGE_ROOT.resolve())):
        return "Erro de permissão: o arquivo precisa estar dentro do diretório autorizado storage/."

    if not target.exists():
        disponiveis = [p.name for p in STORAGE_ROOT.iterdir() if p.is_file()]
        return f"Arquivo '{caminho}' não encontrado em storage/. Arquivos disponíveis: {disponiveis}"

    if target.suffix.lower() == ".pdf":
        if PdfReader is None:
            return "Arquivo PDF detectado, mas 'pypdf' não está instalado no ambiente."
        reader = PdfReader(str(target))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text[:15000]

    return target.read_text(encoding="utf-8", errors="replace")[:15000]
