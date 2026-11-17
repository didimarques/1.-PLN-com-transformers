"""Database initialization script enabling pgvector, creating tables, and seeding restaurant data."""

from sqlalchemy import text
from app.database.connection import Base, engine
from app.database import models  # noqa: F401
from app.database.seed_restaurant import seed_restaurant_purchases


def initialize_database() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    Base.metadata.create_all(bind=engine)
    inserted = seed_restaurant_purchases()
    print("Banco inicializado com sucesso!")
    print("Extensão pgvector habilitada.")
    print(f"Tabelas criadas. Registros inseridos em compras_restaurante: {inserted}")


if __name__ == "__main__":
    initialize_database()
