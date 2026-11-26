"""FastAPI entry point, health checks, and LangChain real search orchestration API."""

import json
import subprocess
import time
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import engine, get_db
from app.database.init_db import initialize_database
from app.services.orchestrator import run_langchain_flow, stream_langchain_flow
from app.tools.files.search import STORAGE_ROOT


def _ensure_postgres_running() -> None:
    """Ensure Docker PostgreSQL is up and initialized when FastAPI boots."""
    project_root = Path(__file__).resolve().parents[1]
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        print("[STARTUP] PostgreSQL não respondeu. Subindo container Docker automaticamente...")
        subprocess.run(
            ["docker", "compose", "up", "-d"],
            cwd=str(project_root),
            check=False,
        )
        for _ in range(20):
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                break
            except Exception:
                time.sleep(1.0)

    try:
        initialize_database()
    except Exception as exc:
        print(f"[AVISO] Não foi possível inicializar o PostgreSQL automaticamente: {exc}")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _ensure_postgres_running()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OrchestrateRequest(BaseModel):
    query: str
    mode: str = "auto"
    session_id: str = "web-session"
    model_name: str | None = None
    persona: str = "default"


class CompareModelsRequest(BaseModel):
    query: str
    mode: str = "auto"
    models: list[str] = [
        "openai/gpt-6.1-sol",
        "google/gemini-4-hydrogen",
        "moonshotai/kimi-k3.1-pro",
    ]


@app.get("/health")
def health():
    return {
        "app": settings.app_name,
        "environment": settings.environment,
        "status": "ok",
    }


@app.get("/health/db")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "database": "PostgreSQL",
            "status": "connected",
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )


@app.get("/health/vector")
def vector_health(db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        ).scalar_one_or_none()

        if not result:
            raise HTTPException(
                status_code=503,
                detail="pgvector not installed",
            )

        return {
            "extension": "pgvector",
            "version": result,
            "status": "enabled",
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Could not verify pgvector",
        )


@app.get("/api/storage/files")
def list_storage_files():
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    files = [p.name for p in sorted(STORAGE_ROOT.iterdir()) if p.is_file()]
    return {"storage_dir": str(STORAGE_ROOT), "files": files}


@app.get("/api/storage/download/{filename}")
def download_storage_file(filename: str):
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    target = (STORAGE_ROOT / filename).resolve()
    if not str(target).startswith(str(STORAGE_ROOT.resolve())) or not target.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado em storage/.")
    media_type = "application/pdf" if target.suffix.lower() == ".pdf" else "application/octet-stream"
    return FileResponse(path=str(target), filename=target.name, media_type=media_type)


@app.post("/api/orchestrate")
def orchestrate(payload: OrchestrateRequest):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="A consulta não pode estar vazia.")
    try:
        return run_langchain_flow(
            query=payload.query,
            mode=payload.mode,
            session_id=payload.session_id,
            model_name=payload.model_name,
            persona=payload.persona,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/orchestrate/stream")
def orchestrate_stream(payload: OrchestrateRequest):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="A consulta não pode estar vazia.")

    def event_generator():
        try:
            for ev in stream_langchain_flow(
                query=payload.query,
                mode=payload.mode,
                session_id=payload.session_id,
                model_name=payload.model_name,
                persona=payload.persona,
            ):
                yield f"data: {json.dumps(ev, ensure_ascii=False, default=str)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'event': 'error', 'detail': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/compare-models")
def compare_models(payload: CompareModelsRequest):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="A consulta não pode estar vazia.")

    results = []
    for idx, m_name in enumerate(payload.models):
        try:
            res = run_langchain_flow(
                query=payload.query,
                mode=payload.mode,
                session_id=f"compare-{idx}-{int(time.time())}",
                model_name=m_name,
            )
            results.append({
                "model": res.get("model", m_name),
                "status": "ok",
                "duration_ms": res.get("duration_ms", 0),
                "token_usage": res.get("token_usage", {}),
                "tool_executions": [
                    {
                        "tool": te["tool"],
                        "category": te["category"],
                        "duration_ms": te["duration_ms"],
                        "payload_tokens_est": te.get("payload_tokens_est", 0),
                    }
                    for te in res.get("tool_executions", [])
                ],
                "final_answer_preview": (res.get("final_answer") or "")[:240],
            })
        except Exception as exc:
            results.append({
                "model": m_name,
                "status": "error",
                "error": str(exc),
                "duration_ms": 0,
                "token_usage": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "tool_calling_tokens": 0},
                "tool_executions": [],
            })

    return {"query": payload.query, "mode": payload.mode, "comparisons": results}


class GeneratePdfRequest(BaseModel):
    titulo: str = "Relatório Gerado"
    conteudo: str
    nome_arquivo: str | None = None


@app.post("/api/generate-pdf")
def generate_pdf_endpoint(payload: GeneratePdfRequest):
    if not payload.conteudo.strip():
        raise HTTPException(status_code=400, detail="O conteúdo do relatório não pode estar vazio.")
    from app.tools.processes.reports import gerar_pdf_relatorio
    fname = payload.nome_arquivo or f"relatorio_{int(time.time())}.pdf"
    res = gerar_pdf_relatorio.invoke({
        "titulo": payload.titulo[:80],
        "conteudo": payload.conteudo,
        "nome_arquivo": fname,
    })
    arquivo = res.get("arquivo") or fname
    download_name = arquivo.replace("\\", "/").split("/")[-1]
    return {
        "status": "ok",
        "arquivo": arquivo,
        "download_url": f"/api/storage/download/{download_name}",
        "detalhes": res,
    }
