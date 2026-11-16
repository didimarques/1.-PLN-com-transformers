"""Report generation process tools."""

from langchain.tools import tool


@tool
def gerar_relatorio_vendas(mes: int, ano: int) -> dict:
    """Gera um relatório de vendas de determinado período."""
    resultado = {
        "mes": mes,
        "ano": ano,
        "status": "relatorio_gerado",
    }
    return resultado
