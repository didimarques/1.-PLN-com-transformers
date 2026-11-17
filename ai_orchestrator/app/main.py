"""FastAPI entry point, health checks, and LangChain real search orchestration API."""

import json
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.services.orchestrator import run_langchain_flow, stream_langchain_flow
from app.tools.files.search import STORAGE_ROOT

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
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
