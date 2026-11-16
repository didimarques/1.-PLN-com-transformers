"""FastAPI entry point and health checks for AI Orchestrator."""

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)


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
