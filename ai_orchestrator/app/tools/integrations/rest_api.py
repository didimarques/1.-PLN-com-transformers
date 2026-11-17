"""Real REST API client tools for external/internal HTTP endpoints."""

import os
import re
import requests
from langchain_core.tools import tool

CLIENTES_API_URL = os.getenv("CLIENTES_API_URL", "").strip()


@tool
def consultar_api(url: str) -> dict:
    """Executa uma requisição HTTP GET real em uma API REST pública HTTPS autorizada (ex: ViaCEP, BrasilAPI, GitHub)."""
    if not url.startswith("https://"):
        return {"erro": "Apenas URLs HTTPS autorizadas são permitidas."}

    try:
        response = requests.get(
            url,
            headers={"User-Agent": "AIOrchestrator/1.0", "Accept": "application/json"},
            timeout=10,
        )
        status_code = response.status_code
        response.raise_for_status()
        try:
            payload = response.json()
        except Exception:
            payload = response.text[:1500]
        return {
            "fonte": f"API REST ({url})",
            "status_http": status_code,
            "dados": payload,
        }
    except Exception as exc:
        return {"fonte": f"API REST ({url})", "erro": str(exc)}


@tool
def consultar_cep(cep: str) -> dict:
    """Consulta endereço real de um CEP brasileiro via API REST pública ViaCEP."""
    digits = re.sub(r"\D", "", cep)
    if len(digits) != 8:
        return {"erro": f"CEP inválido: '{cep}'. Informe 8 dígitos."}
    return consultar_api.invoke({"url": f"https://viacep.com.br/ws/{digits}/json/"})


@tool
def consultar_cliente(cpf: str) -> dict:
    """Consulta dados de um cliente pelo CPF no endpoint REST configurado em CLIENTES_API_URL."""
    if not CLIENTES_API_URL:
        return {
            "fonte": "API REST de Clientes",
            "status": "nao_configurada",
            "mensagem": "CLIENTES_API_URL não configurada no .env. Para APIs públicas reais, use consultar_cep ou consultar_api.",
        }
    try:
        response = requests.get(CLIENTES_API_URL, params={"cpf": cpf}, timeout=10)
        response.raise_for_status()
        return {"fonte": "API REST de Clientes", "dados": response.json()}
    except Exception as exc:
        return {"fonte": "API REST de Clientes", "erro": str(exc)}
