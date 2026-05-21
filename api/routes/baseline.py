"""
api/routes/baseline.py
Core baseline fit / transform / evaluate endpoints.
"""

from __future__ import annotations

import io
from typing import Literal, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from scipy.linalg import inv

from config import FEATURE_COLUMNS, MIN_BASELINE_SESSIONS
from core.baseline_engine import build_baseline, compute_stability_index, BaselineProfile
from core.deviation_engine import compute_deviation, compute_deviation_series
from database.db import (
    get_or_create_user, get_sessions_for_user,
    save_baseline, load_baseline, insert_session, save_deviation,
)
from adaptation.coral import CoralAdapter
from adaptation.moving_average import MovingAverageAdapter
from adaptation.z_score import ZScoreAdapter

router = APIRouter()


class FitRequest(BaseModel):
    user_id: str
    adapter: Literal["none", "zscore", "coral", "moving_average"] = "zscore"


class TransformRequest(BaseModel):
    user_id: str
    features: list[float]
    adapter: Literal["none", "zscore", "coral", "moving_average"] = "zscore"


class SessionData(BaseModel):
    user_id: str
    features: list[float]
    session_tag: str = ""


def _get_feature_matrix(user_id: str) -> pd.DataFrame:
    uid = get_or_create_user(user_id)
    session_df = get_sessions_for_user(uid)
    if session_df.empty:
        raise HTTPException(404, f"No sessions found for user '{user_id}'")
    return pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)


def _resolve_adapter(name: str, profile: BaselineProfile):
    if name == "zscore":
        return ZScoreAdapter(profile)
    elif name == "coral":
        return CoralAdapter(profile)
    elif name == "moving_average":
        return MovingAverageAdapter(profile)
    return None


@router.post("/session")
def add_session(payload: SessionData):
    uid = get_or_create_user(payload.user_id)
    if len(payload.features) != len(FEATURE_COLUMNS):
        raise HTTPException(
            422,
            f"Expected {len(FEATURE_COLUMNS)} features, got {len(payload.features)}",
        )
    session_id = insert_session(uid, payload.features, session_tag=payload.session_tag)
    return {"session_id": session_id, "user_id": payload.user_id}


@router.post("/upload-csv")
async def upload_csv(user_id: str = Form(...), file: UploadFile = File(...)):
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {e}")

    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(422, f"Missing columns: {missing}")

    uid = get_or_create_user(user_id)
    saved = 0
    for _, row in df.iterrows():
        features = row[FEATURE_COLUMNS].tolist()
        tag = str(row.get("session", saved))
        insert_session(uid, features, session_tag=tag)
        saved += 1

    return {"user_id": user_id, "sessions_saved": saved}


@router.post("/fit")
def fit(payload: FitRequest):
    feature_rows = _get_feature_matrix(payload.user_id)
    uid = get_or_create_user(payload.user_id)

    profile = build_baseline(feature_rows, user_name=payload.user_id)
    if profile is None:
        raise HTTPException(
            422,
            f"Not enough sessions (need ≥ {MIN_BASELINE_SESSIONS}, "
            f"got {len(feature_rows)})",
        )

    save_baseline(uid, profile.mean, profile.cov, profile.n_sessions)

    return {
        "user_id":         payload.user_id,
        "n_sessions":      profile.n_sessions,
        "stability_index": round(profile.stability_index, 4),
        "mean":            profile.mean.tolist(),
        "adapter":         payload.adapter,
    }


@router.post("/transform")
def transform(payload: TransformRequest):
    uid = get_or_create_user(payload.user_id)
    bl = load_baseline(uid)
    if bl is None:
        raise HTTPException(404, f"No baseline found for '{payload.user_id}'. Call /fit first.")

    profile = BaselineProfile(
        user_name=payload.user_id,
        mean=bl["mean"],
        cov=bl["cov"],
        cov_inv=inv(bl["cov"]),
        n_sessions=bl["n_sessions"],
        feature_names=FEATURE_COLUMNS,
        stability_index=compute_stability_index(bl["cov"]),
    )

    x = np.array(payload.features, dtype=float)
    adapter = _resolve_adapter(payload.adapter, profile)
    x_aligned = adapter.transform(x) if adapter else x

    result = compute_deviation(x_aligned, profile)

    return {
        "user_id":           payload.user_id,
        "adapter":           payload.adapter,
        "raw_features":      payload.features,
        "aligned_features":  x_aligned.tolist(),
        "mahal_distance":    round(result.mahal_distance, 4),
        "deviation_label":   result.deviation_label,
        "z_scores":          {k: round(v, 4) for k, v in result.z_scores.items()},
        "feature_contributions": [
            {"feature": f, "abs_z": round(z, 4)}
            for f, z in result.feature_contributions
        ],
    }


@router.get("/profile/{user_id}")
def get_profile(user_id: str):
    uid = get_or_create_user(user_id)
    bl = load_baseline(uid)
    if bl is None:
        raise HTTPException(404, f"No baseline for '{user_id}'")

    session_df = get_sessions_for_user(uid)
    feature_rows = pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)

    profile = BaselineProfile(
        user_name=user_id,
        mean=bl["mean"],
        cov=bl["cov"],
        cov_inv=inv(bl["cov"]),
        n_sessions=bl["n_sessions"],
        feature_names=FEATURE_COLUMNS,
        stability_index=compute_stability_index(bl["cov"]),
    )

    dev_series = compute_deviation_series(feature_rows, profile)

    return {
        "user_id":         user_id,
        "n_sessions":      bl["n_sessions"],
        "stability_index": round(compute_stability_index(bl["cov"]), 4),
        "updated_at":      str(bl["updated_at"]),
        "mean":            bl["mean"].tolist(),
        "deviation_series": {
            "session_indices":  dev_series["session_index"].tolist(),
            "mahal_distances":  [round(v, 4) for v in dev_series["mahal_distance"].tolist()],
            "deviation_labels": dev_series["deviation_label"].tolist(),
        },
    }
