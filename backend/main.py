from __future__ import annotations

"""
2ndGM AI Chess Lab — Backend Entry Point
=========================================
FastAPI application with:
  - CORS for Expo dev server and production origins
  - Lifespan context manager for Stockfish warm-up / graceful shutdown
  - Router registration (Phase 1.1: /api/analyze)

Run locally (Windows):
    python run.py

Run locally (Linux / macOS):
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""


import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.stockfish_service import StockfishService
from db.neo4j_client import neo4j_client
from routers import analyze, coach, repertoire

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("2ndGM.main")


# ---------------------------------------------------------------------------
# Application lifecycle — Stockfish warm-up and graceful shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise shared resources before serving requests."""
    logger.info("🚀  2ndGM backend starting — warming up Stockfish…")
    engine_service = StockfishService()
    await engine_service.start()
    await neo4j_client.init_db()

    # Store on app state so routers can reach the singleton
    app.state.stockfish = engine_service
    logger.info("✅  Stockfish ready.")

    yield  # ← application runs here

    logger.info("🛑  Shutting down Stockfish subprocess…")
    await engine_service.stop()
    await neo4j_client.close()
    logger.info("👋  Shutdown complete.")


# ---------------------------------------------------------------------------
# FastAPI instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="2ndGM AI Chess Lab API",
    version="1.0.0",
    description=(
        "High-performance chess analysis backend powering 2ndGM. "
        "Stockfish engine via python-chess, Gemini AI coach, "
        "PostgreSQL game history, Neo4j repertoire graph."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Read from env; fall back to broad local dev origins.
import os
from dotenv import load_dotenv

load_dotenv()

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:19006,http://localhost:3000,http://127.0.0.1:19006",
)
allowed_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS configured for origins: %s", allowed_origins)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(analyze.router, prefix="/api")
app.include_router(coach.router, prefix="/api")
app.include_router(repertoire.router, prefix="/api")

# Phase 1.2+ routers will be added here:
from routers import puzzles, telemetry, sparring
app.include_router(puzzles.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")
app.include_router(sparring.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Lightweight liveness probe — returns 200 when the server is up."""
    return {"status": "ok", "service": "2ndGM Backend"}
