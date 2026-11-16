"""PostgreSQL database tool integration for sales queries."""

from langchain.tools import tool
from sqlalchemy import text
from app.database.connection import SessionLocal


@tool
def consultar_vendas(mes: int, ano: int) -> dict:
    """Consulta o faturamento e total de vendas de um mês e ano no PostgreSQL."""
    try:
        with SessionLocal() as db:
            row = db.execute(
                text(
                    "SELECT COUNT(*) AS total_execucoes FROM executions "
                    "WHERE EXTRACT(MONTH FROM created_at) = :mes "
                    "AND EXTRACT(YEAR FROM created_at) = :ano"
                ),
                {"mes": mes, "ano": ano},
            ).mappings().first()
            return {
                "fonte": "PostgreSQL (interno)",
                "mes": mes,
                "ano": ano,
                "registros": int(row["total_execucoes"]) if row else 0,
            }
    except Exception as exc:
        return {
            "fonte": "PostgreSQL (interno)",
            "mes": mes,
            "ano": ano,
            "erro": str(exc),
        }
