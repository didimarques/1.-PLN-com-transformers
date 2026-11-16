"""Database initialization script enabling pgvector and creating tables."""

from sqlalchemy import text
from app.database.connection import Base, engine
from app.database import models  # noqa: F401


def initialize_database() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    Base.metadata.create_all(bind=engine)
    print("Banco inicializado com sucesso!")
    print("Extensão pgvector habilitada.")
    print("Tabelas criadas.")


if __name__ == "__main__":
    initialize_database()
