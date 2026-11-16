"""General-purpose operational agent with database, files, API, web and process tools."""

from app.core.model_factory import get_model
from app.tools.database.postgres import consultar_vendas
from app.tools.files.reader import ler_pdf
from app.tools.integrations.rest_api import consultar_cliente
from app.tools.integrations.web_search import web_search
from app.tools.processes.reports import gerar_relatorio_vendas

SYSTEM_PROMPT = """
Você é um assistente de operações empresariais.
Você possui acesso a ferramentas para:
- Consultar bancos de dados.
- Ler documentos.
- Consultar APIs.
- Pesquisar informações na internet.
- Executar processos internos.
Regras:
1. Utilize ferramentas quando necessário.
2. Não invente resultados de consultas.
3. Informe quando uma fonte não estiver disponível.
4. Não execute operações sem autorização.
5. Diferencie informações internas de informações externas.
""".strip()

tools = [
    consultar_vendas,
    ler_pdf,
    consultar_cliente,
    web_search,
    gerar_relatorio_vendas,
]


def build_general_agent():
    """Create the configured general operational agent."""
    from langchain.agents import create_agent

    return create_agent(
        model=get_model(),
        tools=tools,
        system_prompt=SYSTEM_PROMPT,
    )
