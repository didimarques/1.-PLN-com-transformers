"""File reading utilities for authorized PDF and text documents."""

from pathlib import Path
from langchain.tools import tool

try:
    from langchain_community.document_loaders import PyPDFLoader
except ImportError:
    PyPDFLoader = None

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage"


@tool
def ler_pdf(caminho: str) -> str:
    """Lê o conteúdo de um arquivo PDF autorizado dentro do diretório storage/."""
    target = (STORAGE_ROOT / caminho).resolve() if not Path(caminho).is_absolute() else Path(caminho).resolve()
    if not str(target).startswith(str(STORAGE_ROOT.resolve())):
        raise PermissionError("Acesso negado: o arquivo precisa estar dentro de storage/.")

    if PyPDFLoader is None:
        raise ImportError("Instale langchain-community e pypdf para ler arquivos PDF.")

    documentos = PyPDFLoader(str(target)).load()
    return "\n".join(documento.page_content for documento in documentos)[:15000]
