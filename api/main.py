"""
api/main.py
FastAPI application — Baseline performance infrastructure layer.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database.db import init_db
from api.routes import baseline, experiments, data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Baseline API",
    description=(
        "Lightweight personalization and representation-alignment layer "
        "for wearable EEG systems under longitudinal drift."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(baseline.router,    prefix="/api/baseline",     tags=["baseline"])
app.include_router(experiments.router, prefix="/api/experiments",  tags=["experiments"])
app.include_router(data.router,        prefix="/api/data",         tags=["data"])


@app.get("/")
def root():
    return {
        "system": "Baseline",
        "version": "0.1.0",
        "status": "operational",
        "description": (
            "EEG representation alignment layer for longitudinal stability "
            "under wearable deployment constraints."
        ),
    }


@app.get("/health")
def health():
    return {"status": "ok"}
