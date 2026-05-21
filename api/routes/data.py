"""
api/routes/data.py
Synthetic data generation and subject management endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from utils.synthetic import generate_all_subjects, generate_subject_sessions
from database.db import (
    list_users, get_or_create_user, get_sessions_for_user,
    insert_session, load_baseline,
)
from config import FEATURE_COLUMNS, SESSION_COLUMN
from core.baseline_engine import compute_stability_index

router = APIRouter()


class GenerateRequest(BaseModel):
    n_sessions: int = 30
    include_shift: bool = False
    seed: int = 42
    load_to_db: bool = True


@router.post("/generate-synthetic")
def generate_synthetic(payload: GenerateRequest):
    datasets = generate_all_subjects(
        n_sessions=payload.n_sessions,
        include_shift=payload.include_shift,
        seed=payload.seed,
    )
    result = {}
    for name, df in datasets.items():
        if payload.load_to_db:
            uid = get_or_create_user(name)
            for _, row in df.iterrows():
                features = row[FEATURE_COLUMNS].tolist()
                tag = str(row.get(SESSION_COLUMN, ""))
                insert_session(uid, features, session_tag=tag)

        result[name] = {
            "n_sessions": len(df),
            "preview": df[FEATURE_COLUMNS].head(3).to_dict(orient="records"),
        }

    return {
        "subjects_generated": list(result.keys()),
        "loaded_to_db": payload.load_to_db,
        "per_subject": result,
    }


@router.get("/subjects")
def list_subjects():
    users = list_users()
    out = []
    for u in users:
        uid = get_or_create_user(u)
        df = get_sessions_for_user(uid)
        bl = load_baseline(uid)
        out.append({
            "user_id":      u,
            "n_sessions":   len(df),
            "has_baseline": bl is not None,
            "stability":    round(compute_stability_index(bl["cov"]), 4) if bl else None,
        })
    return {"subjects": out, "count": len(out)}


@router.get("/subject/{user_id}/sessions")
def get_sessions(user_id: str):
    uid = get_or_create_user(user_id)
    df = get_sessions_for_user(uid)
    if df.empty:
        return {"user_id": user_id, "sessions": []}

    records = []
    for i, row in enumerate(df["features"].tolist()):
        records.append({"index": i, "features": row})

    return {"user_id": user_id, "n_sessions": len(records), "sessions": records}


@router.get("/subject/{user_id}/raw-features")
def get_raw_features(user_id: str):
    uid = get_or_create_user(user_id)
    df = get_sessions_for_user(uid)
    if df.empty:
        return {"user_id": user_id, "feature_names": FEATURE_COLUMNS, "data": {}}

    import pandas as pd
    feature_rows = pd.DataFrame(df["features"].tolist(), columns=FEATURE_COLUMNS)

    return {
        "user_id":      user_id,
        "feature_names": FEATURE_COLUMNS,
        "n_sessions":   len(feature_rows),
        "data": {
            col: feature_rows[col].tolist() for col in FEATURE_COLUMNS
        },
    }
