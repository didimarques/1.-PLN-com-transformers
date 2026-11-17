"""Real Python process tools (PDF generator, report generation, and safe calculator)."""

import ast
import operator
import re
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from langchain_core.tools import tool

STORAGE_ROOT = Path(__file__).resolve().parents[3] / "storage"

_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
}


def _eval_ast(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_ast(node.left), _eval_ast(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_ast(node.operand))
    raise ValueError("Expressão matemática não suportada.")


def _pdf_escape(text_line: str) -> bytes:
    """Encode line in Latin-1 (WinAnsi) and escape PDF string delimiters."""
    safe = text_line.encode("latin-1", errors="replace")
    out = bytearray()
    for b in safe:
        if b in (40, 41, 92):  # '(', ')', '\'
            out.append(92)
        out.append(b)
    return bytes(out)


def _build_simple_pdf(title: str, lines: list[str]) -> tuple[bytes, int]:
    """Generate a valid multi-page PDF 1.4 document in pure Python (WinAnsiEncoding)."""
    wrapped: list[str] = []
    for raw_line in lines:
        if not raw_line.strip():
            wrapped.append("")
        else:
            wrapped.extend(textwrap.wrap(raw_line, width=86) or [""])

    lines_per_page = 46
    pages = [wrapped[i:i + lines_per_page] for i in range(0, max(1, len(wrapped)), lines_per_page)]

    objects: list[bytes] = []
    # 1: Catalog, 2: Pages, 3: FontRegular, 4: FontBold
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"")  # placeholder for /Pages
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

    page_obj_ids: list[int] = []
    for p_idx, page_lines in enumerate(pages):
        stream_parts = [b"BT"]
        if p_idx == 0:
            stream_parts.append(b"/F2 14 Tf 50 780 Td (" + _pdf_escape(title) + b") Tj")
            stream_parts.append(b"0 -22 Td /F1 10 Tf")
        else:
            stream_parts.append(b"/F1 10 Tf 50 780 Td")

        for ln in page_lines:
            stream_parts.append(b"(" + _pdf_escape(ln) + b") Tj 0 -15 Td")

        stream_parts.append(b"ET")
        stream_bytes = b"\n".join(stream_parts)

        content_id = len(objects) + 1
        objects.append(
            f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
            + stream_bytes
            + b"\nendstream"
        )

        page_id = len(objects) + 1
        page_obj_ids.append(page_id)
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
            f"/Contents {content_id} 0 R >>".encode("ascii")
        )

    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    objects[1] = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_obj_ids)} >>".encode("ascii")

    pdf_buf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets: list[int] = [0]
    for idx, obj_body in enumerate(objects, start=1):
        offsets.append(len(pdf_buf))
        pdf_buf.extend(f"{idx} 0 obj\n".encode("ascii"))
        pdf_buf.extend(obj_body)
        pdf_buf.extend(b"\nendobj\n")

    xref_pos = len(pdf_buf)
    pdf_buf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets[1:]:
        pdf_buf.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    pdf_buf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf_buf), len(pages)


@tool
def calcular_expressao(expressao: str) -> dict:
    """Calcula uma expressão matemática em Python com segurança (ferramenta Calculadora)."""
    try:
        tree = ast.parse(expressao.strip(), mode="eval")
        resultado = _eval_ast(tree.body)
        return {"expressao": expressao, "resultado": resultado}
    except Exception as exc:
        return {"expressao": expressao, "erro": str(exc)}


@tool
def gerar_relatorio_vendas(mes: int, ano: int) -> dict:
    """Executa processo Python real que gera e salva um arquivo de relatório em storage/."""
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    filename = f"relatorio_vendas_{mes:02d}_{ano}.md"
    out_path = STORAGE_ROOT / filename
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    content = (
        f"# Relatório Gerado Automaticamente — {mes:02d}/{ano}\n"
        f"- Gerado em: {timestamp}\n"
        f"- Origem: Processo Python (`gerar_relatorio_vendas`)\n"
        f"- Status: concluído e salvo em `storage/{filename}`\n"
    )
    out_path.write_text(content, encoding="utf-8")

    return {
        "fonte": "Processo Python Interno",
        "mes": mes,
        "ano": ano,
        "status": "relatorio_gerado",
        "arquivo": f"storage/{filename}",
    }


def _clean_markdown_for_pdf(text: str) -> list[str]:
    """Convert markdown/chat text into clean, readable report lines for PDF output."""
    cleaned_lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        # Skip markdown table separator rows like |---|---|
        if re.match(r"^\|[\s:\-\|]+\|$", line):
            continue
        # Convert markdown table row | A | B | C | -> A | B | C
        if line.startswith("|") and line.endswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            line = "  |  ".join(cells)
        # Convert headings ### Title -> TITLE
        line = re.sub(r"^#{1,6}\s*", "", line)
        # Strip bold/italic/code markers
        line = line.replace("**", "").replace("__", "").replace("`", "")
        cleaned_lines.append(line)
    return cleaned_lines


@tool
def gerar_pdf_relatorio(
    titulo: str,
    conteudo: str,
    nome_arquivo: str = "relatorio_financeiro_restaurante.pdf",
) -> dict:
    """Processo Python real que gera um arquivo PDF formatado em storage/ com os dados e análises solicitadas."""
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", nome_arquivo.strip() or "relatorio.pdf")
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"

    out_path = STORAGE_ROOT / safe_name
    timestamp = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    body_lines = _clean_markdown_for_pdf(conteudo)
    lines = [
        f"Gerado em: {timestamp} | AI Orchestrator (Processo Python PDF)",
        "-" * 78,
        "",
        *body_lines,
    ]

    pdf_bytes, num_pages = _build_simple_pdf(titulo, lines)
    out_path.write_bytes(pdf_bytes)

    return {
        "fonte": "Processo Python Interno (Gerador PDF)",
        "status": "pdf_gerado",
        "titulo": titulo,
        "arquivo": f"storage/{safe_name}",
        "paginas": num_pages,
        "tamanho_bytes": len(pdf_bytes),
    }
