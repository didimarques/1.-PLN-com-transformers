"""Real Python process tools (report generation and safe calculator)."""

import ast
import operator
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
