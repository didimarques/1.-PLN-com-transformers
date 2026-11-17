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
def consultar_vendas(ano: int | None = None, mes: int | None = None) -> dict:
    """Consulta dados financeiros do restaurante (compras/movimentações de 2025 e 2026) na tabela compras_restaurante do PostgreSQL."""
    return consultar_compras_restaurante.invoke({"ano": ano, "mes": mes, "categoria": None})


@tool
def consultar_compras_restaurante(
    ano: int | None = None,
    mes: int | None = None,
    categoria: str | None = None,
) -> dict:
    """Consulta dados financeiros reais da tabela compras_restaurante (anos 2025 e 2026) no PostgreSQL."""
    conditions = []
    params: dict = {}
    if ano is not None:
        conditions.append("ano = :ano")
        params["ano"] = ano
    if mes is not None:
        conditions.append("mes = :mes")
        params["mes"] = mes
    if categoria:
        conditions.append("LOWER(categoria) LIKE :categoria")
        params["categoria"] = f"%{categoria.lower()}%"

    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    try:
        with SessionLocal() as db:
            totais = db.execute(
                text(
                    f"SELECT COUNT(*) AS qtd_compras, COALESCE(SUM(valor_total), 0) AS total_gasto "
                    f"FROM compras_restaurante {where_sql}"
                ),
                params,
            ).mappings().first()

            por_ano = db.execute(
                text(
                    f"SELECT ano, COUNT(*) AS compras, ROUND(SUM(valor_total)::numeric, 2) AS total "
                    f"FROM compras_restaurante {where_sql} GROUP BY ano ORDER BY ano"
                ),
                params,
            ).mappings().all()

            por_categoria = db.execute(
                text(
                    f"SELECT categoria, COUNT(*) AS compras, ROUND(SUM(valor_total)::numeric, 2) AS total "
                    f"FROM compras_restaurante {where_sql} GROUP BY categoria ORDER BY total DESC"
                ),
                params,
            ).mappings().all()

            amostra = db.execute(
                text(
                    f"SELECT data_compra, ano, mes, categoria, produto, fornecedor, quantidade, unidade, valor_total, forma_pagamento "
                    f"FROM compras_restaurante {where_sql} ORDER BY valor_total DESC LIMIT 8"
                ),
                params,
            ).mappings().all()

            return {
                "fonte": "PostgreSQL (tabela compras_restaurante)",
                "filtros": {"ano": ano, "mes": mes, "categoria": categoria},
                "resumo": {
                    "qtd_compras": int(totais["qtd_compras"]) if totais else 0,
                    "total_gasto": round(float(totais["total_gasto"]), 2) if totais else 0.0,
                },
                "por_ano": [
                    {"ano": int(r["ano"]), "compras": int(r["compras"]), "total": float(r["total"])}
                    for r in por_ano
                ],
                "por_categoria": [
                    {"categoria": r["categoria"], "compras": int(r["compras"]), "total": float(r["total"])}
                    for r in por_categoria
                ],
                "maiores_compras": [
                    {
                        "data": str(r["data_compra"]),
                        "categoria": r["categoria"],
                        "produto": r["produto"],
                        "fornecedor": r["fornecedor"],
                        "qtd": f"{r['quantidade']} {r['unidade']}",
                        "valor_total": round(float(r["valor_total"]), 2),
                        "pagamento": r["forma_pagamento"],
                    }
                    for r in amostra
                ],
            }
    except Exception as exc:
        return {
            "fonte": "PostgreSQL (tabela compras_restaurante)",
            "status": "indisponivel",
            "erro": str(exc),
        }
