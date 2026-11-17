"""LangChain Architecture Flow Orchestrator with real tool-calling and memory."""

import json
import time
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.memory import MemoryStore
from app.core.model_factory import get_model
from app.tools.database.postgres import (
    consultar_banco_dados,
    consultar_compras_restaurante,
    consultar_vendas,
)
from app.tools.files.reader import ler_arquivo
from app.tools.files.search import buscar_em_arquivos
from app.tools.integrations.rest_api import consultar_api, consultar_cep, consultar_cliente
from app.tools.integrations.web_search import web_search
from app.tools.processes.reports import (
    calcular_expressao,
    gerar_pdf_relatorio,
    gerar_relatorio_vendas,
)

ALL_TOOLS = [
    buscar_em_arquivos,
    ler_arquivo,
    web_search,
    consultar_api,
    consultar_cep,
    consultar_cliente,
    consultar_banco_dados,
    consultar_compras_restaurante,
    consultar_vendas,
    gerar_relatorio_vendas,
    gerar_pdf_relatorio,
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
    "consultar_compras_restaurante": "database",
    "consultar_vendas": "database",
    "gerar_relatorio_vendas": "process",
    "gerar_pdf_relatorio": "process",
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
- Banco de Dados PostgreSQL: consultar_banco_dados, consultar_compras_restaurante, consultar_vendas
- Processos Python / Calculadora / PDF: gerar_relatorio_vendas, gerar_pdf_relatorio, calcular_expressao

Regras obrigatórias:
1. Limite-se ESTRITAMENTE ao que foi solicitado pelo usuário. Não consulte ferramentas ou fontes extras que não sejam necessárias para responder ao pedido.
2. Nunca invente resultados, valores ou URLs.
3. Se uma fonte (ex: PostgreSQL ou API) retornar indisponível, informe claramente o motivo retornado pela ferramenta.
4. Diferencie sempre informações internas (arquivos/banco/processos) de informações externas (web/APIs públicas).
5. Diretiva de modo atual: {mode_instruction}
"""

JAKE_PERALTA_PROMPT = """Você é o Detetive Jake Peralta, o Maestro investigativo de uma empresa do ramo financeiro de pagamentos digitais (fintech de PIX, cartões, conciliação, antifraude e chargeback).
Sua missão é resolver problemas dos usuários investigando pistas reais com suas ferramentas (Tool Calling) antes de responder.

Personalidade e Estilo:
- Tom ágil, carismático e investigativo de detetive ("Caso aberto!", "Pistas coletadas!", "Cool, cool, cool — vamos resolver isso!"), mas sempre objetivo, claro e confiável.
- Você é o Maestro: decide quais ferramentas chamar (Arquivos, Banco de Dados PostgreSQL, APIs REST, Web Search, Calculadora e Gerador de PDF) para encontrar exatamente a informação que o usuário precisa.

Regras obrigatórias:
1. NUNCA invente números, valores, status de transações ou links. Sempre consulte suas ferramentas primeiro.
2. Diferencie claramente pistas internas (arquivos de `storage/`, PostgreSQL, processos Python) de fontes externas (Web Search, APIs públicas).
3. Se o usuário pedir relatório ou dossiê em PDF, chame `gerar_pdf_relatorio`.
4. Diretiva de modo atual: {mode_instruction}
"""

_memory_store = MemoryStore()


def _select_tools_for_mode(mode: str) -> list:
    """Restrict bound tools to the requested category unless mode is 'auto'."""
    if mode and mode != "auto":
        filtered = [t for t in ALL_TOOLS if TOOL_CATEGORY_MAP.get(t.name) == mode]
        if filtered:
            return filtered
    return ALL_TOOLS


def stream_langchain_flow(
    query: str,
    mode: str = "auto",
    session_id: str = "default",
    model_name: str | None = None,
    persona: str = "default",
):
    """Stream real-time events for each step and tool call in the 7-step LangChain Flow."""
    started_at = time.perf_counter()
    flow_steps: list[dict[str, Any]] = []
    tool_executions: list[dict[str, Any]] = []

    def emit_stage(stage_id: str, label: str, detail: str, pct: int):
        step_obj = {"stage": stage_id, "label": label, "detail": detail, "pct": pct}
        flow_steps.append(step_obj)
        return {"event": "stage", **step_obj}

    # 1. User Input
    yield emit_stage("user_input", "1. User Input", f'Comando recebido: "{query}" (modo: {mode})', 12)

    # 2. Prompt Template + Memory load
    history_raw = _memory_store.get_messages(session_id)[-6:]
    history_msgs = []
    for m in history_raw:
        if m["role"] == "user":
            history_msgs.append(HumanMessage(content=m["content"]))
        else:
            history_msgs.append(SystemMessage(content=f"[Histórico] {m['content'][:300]}"))

    mode_instruction = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["auto"])
    active_sys_prompt = JAKE_PERALTA_PROMPT if persona == "jake_peralta" else SYSTEM_PROMPT
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", active_sys_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])
    formatted_messages = prompt_template.format_messages(
        mode_instruction=mode_instruction,
        history=history_msgs,
        input=query,
    )

    yield emit_stage(
        "prompt_template",
        "2. Prompt Template",
        f"ChatPromptTemplate formatou regras focadas + {len(history_msgs)} msg(s) de memória.",
        24,
    )

    # 3. LLM / Chat Model + Tool Binding (escopo estrito ao modo selecionado)
    bound_tools = _select_tools_for_mode(mode)
    llm = get_model(model_name=model_name, temperature=0, max_tokens=1024)
    llm_with_tools = llm.bind_tools(bound_tools)

    yield emit_stage(
        "llm_model",
        "3. LLM / Chat Model",
        f"Modelo {llm.model_name} conectado com {len(bound_tools)} ferramenta(s) permitida(s) para '{mode}'.",
        36,
    )

    # 4. Chain (Pipeline)
    yield emit_stage(
        "chain",
        "4. Chain (Pipeline)",
        "Analisando o pedido para acionar apenas as ferramentas estritamente necessárias...",
        48,
    )

    messages = list(formatted_messages)
    final_text = ""

    # 5. Agent & Tools Loop
    for iteration in range(8):
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
            t_cat = TOOL_CATEGORY_MAP.get(t_name, "other")

            yield {
                "event": "tool_start",
                "tool": t_name,
                "category": t_cat,
                "args": t_args,
            }

            t_start = time.perf_counter()
            tool_fn = TOOL_MAP.get(t_name)
            if tool_fn is None or tool_fn not in bound_tools:
                result_obj: Any = {"erro": f"Ferramenta '{t_name}' não autorizada no modo '{mode}'."}
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

            exec_obj = {
                "tool": t_name,
                "category": t_cat,
                "args": t_args,
                "result": result_obj,
                "status": status,
                "duration_ms": elapsed_ms,
            }
            tool_executions.append(exec_obj)
            yield {"event": "tool_result", **exec_obj}

            messages.append(ToolMessage(content=result_str[:6000], tool_call_id=t_id))
    else:
        final_msg = llm_with_tools.invoke(messages)
        final_text = final_msg.content if isinstance(final_msg.content, str) else str(final_msg.content)

    # Garantia determinística apenas se o usuário pediu PDF e a ferramenta estiver no escopo
    wants_pdf = "pdf" in query.lower() and gerar_pdf_relatorio in bound_tools
    pdf_already_called = any(te["tool"] == "gerar_pdf_relatorio" and te["status"] == "ok" for te in tool_executions)
    if wants_pdf and not pdf_already_called:
        yield {"event": "tool_start", "tool": "gerar_pdf_relatorio", "category": "process", "args": {"titulo": query[:60]}}
        t_start = time.perf_counter()
        pdf_name = f"relatorio_{session_id}_{int(time.time())}.pdf"
        pdf_body = final_text.strip() or json.dumps([te["result"] for te in tool_executions], ensure_ascii=False, indent=2)
        pdf_res = gerar_pdf_relatorio.invoke({
            "titulo": f"Relatório — {query[:60]}",
            "conteudo": pdf_body,
            "nome_arquivo": pdf_name,
        })
        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)
        exec_obj = {
            "tool": "gerar_pdf_relatorio",
            "category": "process",
            "args": {"titulo": f"Relatório — {query[:60]}", "nome_arquivo": pdf_name},
            "result": pdf_res,
            "status": "ok",
            "duration_ms": elapsed_ms,
        }
        tool_executions.append(exec_obj)
        yield {"event": "tool_result", **exec_obj}
        if pdf_res.get("arquivo") and pdf_res["arquivo"] not in final_text:
            final_text += f"\n\n📄 PDF gerado com sucesso: `{pdf_res['arquivo']}`"

    yield emit_stage(
        "agent_tools",
        "5. Agent & Tools",
        f"{len(tool_executions)} chamada(s) real(is) executada(s) sob demanda.",
        82,
    )

    # 6. Memory
    _memory_store.add_message(session_id, "user", query)
    _memory_store.add_message(session_id, "assistant", final_text)

    yield emit_stage(
        "memory",
        "6. Memory",
        f"Contexto salvo na sessão '{session_id}' ({len(_memory_store.get_messages(session_id))} mensagens).",
        90,
    )

    # 7. Output
    total_ms = round((time.perf_counter() - started_at) * 1000, 1)
    yield emit_stage("output", "7. Output", f"Resposta final consolidada em {total_ms} ms.", 100)

    yield {
        "event": "output",
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


def run_langchain_flow(
    query: str,
    mode: str = "auto",
    session_id: str = "default",
    model_name: str | None = None,
    persona: str = "default",
) -> dict[str, Any]:
    """Execute the 7-step LangChain Architecture Flow synchronously."""
    final_payload: dict[str, Any] = {}
    for ev in stream_langchain_flow(
        query=query,
        mode=mode,
        session_id=session_id,
        model_name=model_name,
        persona=persona,
    ):
        if ev.get("event") == "output":
            final_payload = {k: v for k, v in ev.items() if k != "event"}
    return final_payload
