"""LangChain Architecture Flow Orchestrator with real tool-calling and memory."""

import json
import time
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.memory import MemoryStore
from app.core.model_factory import get_model
from app.tools.database.postgres import consultar_banco_dados, consultar_vendas
from app.tools.files.reader import ler_arquivo
from app.tools.files.search import buscar_em_arquivos
from app.tools.integrations.rest_api import consultar_api, consultar_cep, consultar_cliente
from app.tools.integrations.web_search import web_search
from app.tools.processes.reports import calcular_expressao, gerar_relatorio_vendas

ALL_TOOLS = [
    buscar_em_arquivos,
    ler_arquivo,
    web_search,
    consultar_api,
    consultar_cep,
    consultar_cliente,
    consultar_banco_dados,
    consultar_vendas,
    gerar_relatorio_vendas,
    calcular_expressao,
]

TOOL_MAP = {t.name: t for t in ALL_TOOLS}

TOOL_CATEGORY_MAP = {
    "buscar_em_arquivos": "files",
    "ler_arquivo": "files",
    "web_search": "web",
    "consultar_api": "api",
    "consultar_cep": "api",
    "consultar_cliente": "api",
    "consultar_banco_dados": "database",
    "consultar_vendas": "database",
    "gerar_relatorio_vendas": "process",
    "calcular_expressao": "process",
}

MODE_INSTRUCTIONS = {
    "auto": "Escolha automaticamente as ferramentas necessárias (Arquivos, Web Search, API REST, Banco de Dados ou Processos Python) para responder com precisão.",
    "files": "Priorize as ferramentas de Arquivos (buscar_em_arquivos e ler_arquivo) para buscar e ler documentos reais em storage/.",
    "web": "Priorize a ferramenta web_search para pesquisar informações externas atualizadas na internet.",
    "api": "Priorize as ferramentas de API REST (consultar_api, consultar_cep, consultar_cliente) para consultar endpoints HTTP reais.",
    "database": "Priorize as ferramentas de Banco de Dados (consultar_banco_dados, consultar_vendas) para consultar o PostgreSQL.",
    "process": "Priorize as ferramentas de Processos Python (gerar_relatorio_vendas, calcular_expressao) para executar rotinas e cálculos.",
}

SYSTEM_PROMPT = """Você é um Assistente Orquestrador de IA usando LangChain Tool Calling.
Você possui ferramentas reais para:
- Arquivos: buscar_em_arquivos, ler_arquivo
- Web Search: web_search
- APIs REST: consultar_api, consultar_cep, consultar_cliente
- Banco de Dados PostgreSQL: consultar_banco_dados, consultar_vendas
- Processos Python / Calculadora: gerar_relatorio_vendas, calcular_expressao

Regras obrigatórias:
1. Sempre use as ferramentas disponíveis para obter dados reais antes de responder.
2. Nunca invente resultados, valores ou URLs.
3. Se uma fonte (ex: PostgreSQL ou API) retornar indisponível, informe claramente o motivo retornado pela ferramenta.
4. Diferencie sempre informações internas (arquivos/banco/processos) de informações externas (web/APIs públicas).
5. Diretiva de modo atual: {mode_instruction}
"""

_memory_store = MemoryStore()


def run_langchain_flow(
    query: str,
    mode: str = "auto",
    session_id: str = "default",
    model_name: str | None = None,
) -> dict[str, Any]:
    """Execute the 7-step LangChain Architecture Flow with real tool calling."""
    started_at = time.perf_counter()
    flow_steps: list[dict[str, Any]] = []
    tool_executions: list[dict[str, Any]] = []

    # 1. User Input
    flow_steps.append({
        "stage": "user_input",
        "label": "1. User Input",
        "detail": f'Comando recebido: "{query}" (modo: {mode})',
    })

    # 2. Prompt Template + 6. Memory load
    history_raw = _memory_store.get_messages(session_id)[-6:]
    history_msgs = []
    for m in history_raw:
        if m["role"] == "user":
            history_msgs.append(HumanMessage(content=m["content"]))
        else:
            history_msgs.append(SystemMessage(content=f"[Histórico] {m['content'][:300]}"))

    mode_instruction = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["auto"])
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])
    formatted_messages = prompt_template.format_messages(
        mode_instruction=mode_instruction,
        history=history_msgs,
        input=query,
    )

    flow_steps.append({
        "stage": "prompt_template",
        "label": "2. Prompt Template",
        "detail": f"ChatPromptTemplate formatou regras + {len(history_msgs)} msg(s) de memória + entrada do usuário.",
    })

    # 3. LLM / Chat Model + Tool Binding
    llm = get_model(model_name=model_name, temperature=0, max_tokens=1024)
    llm_with_tools = llm.bind_tools(ALL_TOOLS)

    flow_steps.append({
        "stage": "llm_model",
        "label": "3. LLM / Chat Model",
        "detail": f"Modelo {llm.model_name} inicializado com {len(ALL_TOOLS)} ferramentas vinculadas (bind_tools).",
    })

    # 4. Chain (Pipeline)
    flow_steps.append({
        "stage": "chain",
        "label": "4. Chain (Pipeline)",
        "detail": "Executando cadeia de raciocínio e decisão de chamadas de ferramentas (Tool Calling Loop).",
    })

    messages = list(formatted_messages)
    final_text = ""

    # 5. Agent & Tools Loop (até 4 iterações de tool calling)
    for iteration in range(4):
        ai_msg = llm_with_tools.invoke(messages)
        messages.append(ai_msg)

        tool_calls = getattr(ai_msg, "tool_calls", None) or []
        if not tool_calls:
            final_text = ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content)
            break

        for tc in tool_calls:
            t_name = tc.get("name", "")
            t_args = tc.get("args", {})
            t_id = tc.get("id", f"call_{iteration}")
            t_start = time.perf_counter()

            tool_fn = TOOL_MAP.get(t_name)
            if tool_fn is None:
                result_obj: Any = {"erro": f"Ferramenta '{t_name}' não registrada."}
                status = "error"
            else:
                try:
                    result_obj = tool_fn.invoke(t_args)
                    status = "ok"
                except Exception as exc:
                    result_obj = {"erro": str(exc)}
                    status = "error"

            elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)
            result_str = (
                result_obj
                if isinstance(result_obj, str)
                else json.dumps(result_obj, ensure_ascii=False, default=str)
            )

            tool_executions.append({
                "tool": t_name,
                "category": TOOL_CATEGORY_MAP.get(t_name, "other"),
                "args": t_args,
                "result": result_obj,
                "status": status,
                "duration_ms": elapsed_ms,
            })

            messages.append(ToolMessage(content=result_str[:6000], tool_call_id=t_id))
    else:
        final_msg = llm_with_tools.invoke(messages)
        final_text = final_msg.content if isinstance(final_msg.content, str) else str(final_msg.content)

    flow_steps.append({
        "stage": "agent_tools",
        "label": "5. Agent & Tools",
        "detail": f"{len(tool_executions)} chamada(s) real(is) de ferramentas executada(s).",
    })

    # 6. Memory
    _memory_store.add_message(session_id, "user", query)
    _memory_store.add_message(session_id, "assistant", final_text)

    flow_steps.append({
        "stage": "memory",
        "label": "6. Memory",
        "detail": f"Contexto salvo na sessão '{session_id}' ({len(_memory_store.get_messages(session_id))} mensagens).",
    })

    # 7. Output
    total_ms = round((time.perf_counter() - started_at) * 1000, 1)
    flow_steps.append({
        "stage": "output",
        "label": "7. Output",
        "detail": f"Resposta final consolidada em {total_ms} ms.",
    })

    return {
        "query": query,
        "mode": mode,
        "model": llm.model_name,
        "session_id": session_id,
        "duration_ms": total_ms,
        "flow_steps": flow_steps,
        "tool_executions": tool_executions,
        "memory_count": len(_memory_store.get_messages(session_id)),
        "final_answer": final_text,
    }
