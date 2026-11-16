"""Generic REST API client tool for external or internal services."""

import os
import requests
from langchain.tools import tool

CLIENTES_API_URL = os.getenv("CLIENTES_API_URL", "https://api.exemplo.com/clientes")


@tool
def consultar_cliente(cpf: str) -> dict:
    """Consulta os dados de um cliente pelo CPF via API REST autorizada."""
    response = requests.get(
        CLIENTES_API_URL,
        params={"cpf": cpf},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()
