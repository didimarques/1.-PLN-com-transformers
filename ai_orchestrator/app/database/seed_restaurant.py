"""Seed fictitious restaurant financial purchase data for 2025 and 2026."""

from datetime import date
from sqlalchemy import func, select
from app.database.connection import Base, SessionLocal, engine
from app.database.models import CompraRestaurante

CATALOGO_ITENS = [
    ("Carnes & Proteínas", "Filé Mignon Resfriado", "Frigorífico Serra Azul", "kg", 84.50, 45.0, "Boleto 30d"),
    ("Carnes & Proteínas", "Salmão Fresco Inteiro", "Pescados Atlântico", "kg", 76.00, 32.0, "PIX"),
    ("Carnes & Proteínas", "Peito de Frango Orgânico", "Granja Vale Verde", "kg", 24.90, 60.0, "Boleto 15d"),
    ("Hortifruti", "Tomate Italiano Selecionado", "CEASA Distribuidora", "kg", 9.80, 85.0, "PIX"),
    ("Hortifruti", "Alface & Folhas Nobres", "Horta Hidropônica Sul", "cx", 42.00, 22.0, "PIX"),
    ("Laticínios", "Queijo Parmesão Maturado", "Laticínios Boa Vista", "kg", 92.00, 18.0, "Cartão Corporativo"),
    ("Laticínios", "Creme de Leite Fresco", "Laticínios Boa Vista", "L", 28.50, 40.0, "Boleto 15d"),
    ("Bebidas", "Vinho Tinto Reserva", "Importadora Vinhedos", "un", 68.00, 36.0, "Boleto 30d"),
    ("Bebidas", "Café Especial Torra Média", "Torrefação Cerrado", "kg", 74.00, 20.0, "PIX"),
    ("Grãos & Secos", "Azeite Extra Virgem 500ml", "Importadora Mediterrâneo", "un", 46.50, 30.0, "Boleto 30d"),
    ("Grãos & Secos", "Arroz Arbóreo Italiano", "Empório Gastronômico", "kg", 29.00, 50.0, "Boleto 30d"),
    ("Embalagens & Limpeza", "Embalagem Delivery Kraft", "EcoPack Suprimentos", "cx", 135.00, 14.0, "Cartão Corporativo"),
]

PAGAMENTOS = ["PIX", "Boleto 30d", "Cartão Corporativo", "Boleto 15d"]


def seed_restaurant_purchases(force: bool = False) -> int:
    """Populate compras_restaurante with 2025 and 2026 records if empty."""
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        existing = db.execute(select(func.count()).select_from(CompraRestaurante)).scalar_one()
        if existing > 0 and not force:
            return 0

        records: list[CompraRestaurante] = []
        for ano, inflacao in [(2025, 1.00), (2026, 1.08)]:
            for mes in range(1, 13):
                # 2 compras principais por mês em cada ano = 48 registros (2025 e 2026)
                for offset in range(2):
                    idx = ((mes - 1) * 2 + offset) % len(CATALOGO_ITENS)
                    cat, prod, forn, unid, v_unit, qtd_base, pag = CATALOGO_ITENS[idx]
                    sazonal = 1.15 if mes in (7, 11, 12) else 1.0
                    qtd = round(qtd_base * sazonal, 2)
                    unit_price = round(v_unit * inflacao, 2)
                    total = round(qtd * unit_price, 2)
                    dia = 6 + offset * 12

                    records.append(
                        CompraRestaurante(
                            data_compra=date(ano, mes, dia),
                            ano=ano,
                            mes=mes,
                            categoria=cat,
                            produto=prod,
                            fornecedor=forn,
                            quantidade=qtd,
                            unidade=unid,
                            valor_unitario=unit_price,
                            valor_total=total,
                            forma_pagamento=PAGAMENTOS[(mes + offset) % len(PAGAMENTOS)] if pag else "PIX",
                        )
                    )

        db.add_all(records)
        db.commit()
        return len(records)


if __name__ == "__main__":
    inserted = seed_restaurant_purchases()
    print(f"Registros inseridos em compras_restaurante: {inserted}")
