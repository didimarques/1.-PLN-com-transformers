"""PostgreSQL database tool integration for real SQL queries."""

from langchain_core.tools import tool
from sqlalchemy import text
from app.database.connection import SessionLocal


@tool
def consultar_banco_dados(tabela: str = "all") -> dict:
    """Consulta o estado real do PostgreSQL, extensão pgvector e contagem de registros das tabelas do orquestrador."""
    allowed_tables = ["agents", "tools", "connections", "conversations", "messages", "executions"]
    target_tables = allowed_tables if tabela == "all" else [t for t in allowed_tables if t == tabela]

    if not target_tables:
        return {"erro": f"Tabela '{tabela}' não autorizada. Tabelas permitidas: {allowed_tables}"}

    try:
        with SessionLocal() as db:
            pg_version = db.execute(text("SELECT version()")).scalar_one()
            pgvec = db.execute(
                text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
            ).scalar_one_or_none()

            counts = {}
            for tbl in target_tables:
                try:
                    counts[tbl] = int(db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar_one())
                except Exception:
                    counts[tbl] = "tabela_nao_criada"

            return {
                "fonte": "PostgreSQL (127.0.0.1:5432/ai_orchestrator)",
                "status": "conectado",
                "postgres_version": str(pg_version).split(",")[0],
                "pgvector": pgvec or "nao_habilitado",
                "contagem_tabelas": counts,
            }
    except Exception as exc:
        return {
            "fonte": "PostgreSQL (127.0.0.1:5432/ai_orchestrator)",
            "status": "indisponivel",
            "erro": str(exc),
            "dica": "Inicie o Docker Desktop e execute 'docker compose up -d' + 'python -m app.database.init_db'.",
        }


@tool
def consultar_vendas(mes: int, ano: int) -> dict:
    """Consulta registros de execuções/vendas de determinado mês e ano no PostgreSQL."""
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
            "status": "indisponivel",
            "mes": mes,
            "ano": ano,
            "erro": str(exc),
        }
