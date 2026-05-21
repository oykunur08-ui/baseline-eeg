"""
database/db.py
SQLite persistence layer using SQLAlchemy Core (no ORM overhead).
Stores users, sessions, baseline snapshots, and deviation history.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy import (
    Column, Float, Integer, String, Text, DateTime,
    create_engine, text,
)
from sqlalchemy import MetaData, Table

from config import DB_PATH

# ── Engine setup ───────────────────────────────────────────────────────────
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
ENGINE = create_engine(f"sqlite:///{DB_PATH}", echo=False)
META = MetaData()

# ── Table definitions ──────────────────────────────────────────────────────
users_table = Table(
    "users", META,
    Column("id",         Integer, primary_key=True, autoincrement=True),
    Column("name",       String(100), unique=True, nullable=False),
    Column("created_at", DateTime, default=datetime.utcnow),
)

sessions_table = Table(
    "sessions", META,
    Column("id",         Integer, primary_key=True, autoincrement=True),
    Column("user_id",    Integer, nullable=False),
    Column("session_tag",String(50)),
    Column("features",   Text, nullable=False),   # JSON array
    Column("recorded_at",DateTime, default=datetime.utcnow),
)

baselines_table = Table(
    "baselines", META,
    Column("id",          Integer, primary_key=True, autoincrement=True),
    Column("user_id",     Integer, unique=True, nullable=False),
    Column("mean_vector", Text, nullable=False),   # JSON array
    Column("cov_matrix",  Text, nullable=False),   # JSON 2D array
    Column("n_sessions",  Integer, nullable=False),
    Column("updated_at",  DateTime, default=datetime.utcnow),
)

deviations_table = Table(
    "deviations", META,
    Column("id",              Integer, primary_key=True, autoincrement=True),
    Column("user_id",         Integer, nullable=False),
    Column("session_id",      Integer),
    Column("mahal_distance",  Float, nullable=False),
    Column("z_scores",        Text, nullable=False),  # JSON object
    Column("deviation_label", String(20)),
    Column("computed_at",     DateTime, default=datetime.utcnow),
)


def init_db() -> None:
    """Create all tables if they don't exist."""
    META.create_all(ENGINE)


# ── User helpers ───────────────────────────────────────────────────────────

def get_or_create_user(name: str) -> int:
    """Return user id, creating the user if necessary."""
    with ENGINE.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM users WHERE name = :n"), {"n": name}
        ).fetchone()
        if row:
            return row[0]
        result = conn.execute(
            users_table.insert().values(name=name, created_at=datetime.utcnow())
        )
        conn.commit()
        return result.inserted_primary_key[0]


def list_users() -> list[str]:
    with ENGINE.connect() as conn:
        rows = conn.execute(text("SELECT name FROM users ORDER BY name")).fetchall()
    return [r[0] for r in rows]


# ── Session helpers ────────────────────────────────────────────────────────

def insert_session(
    user_id: int,
    features: list[float],
    session_tag: str = "",
) -> int:
    with ENGINE.connect() as conn:
        result = conn.execute(
            sessions_table.insert().values(
                user_id=user_id,
                session_tag=session_tag,
                features=json.dumps(features),
                recorded_at=datetime.utcnow(),
            )
        )
        conn.commit()
        return result.inserted_primary_key[0]


def get_sessions_for_user(user_id: int) -> pd.DataFrame:
    with ENGINE.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, session_tag, features, recorded_at "
                "FROM sessions WHERE user_id = :uid ORDER BY recorded_at"
            ),
            {"uid": user_id},
        ).fetchall()
    if not rows:
        return pd.DataFrame()
    records = []
    for r in rows:
        feat = json.loads(r[2])
        records.append({"session_id": r[0], "session_tag": r[1],
                         "features": feat, "recorded_at": r[3]})
    return pd.DataFrame(records)


# ── Baseline helpers ───────────────────────────────────────────────────────

def save_baseline(
    user_id: int,
    mean_vec: np.ndarray,
    cov_mat: np.ndarray,
    n_sessions: int,
) -> None:
    with ENGINE.connect() as conn:
        existing = conn.execute(
            text("SELECT id FROM baselines WHERE user_id = :uid"),
            {"uid": user_id},
        ).fetchone()
        payload = dict(
            mean_vector=json.dumps(mean_vec.tolist()),
            cov_matrix=json.dumps(cov_mat.tolist()),
            n_sessions=n_sessions,
            updated_at=datetime.utcnow(),
        )
        if existing:
            conn.execute(
                text(
                    "UPDATE baselines SET mean_vector=:mean_vector, "
                    "cov_matrix=:cov_matrix, n_sessions=:n_sessions, "
                    "updated_at=:updated_at WHERE user_id=:uid"
                ),
                {**payload, "uid": user_id},
            )
        else:
            conn.execute(
                baselines_table.insert().values(user_id=user_id, **payload)
            )
        conn.commit()


def load_baseline(user_id: int) -> Optional[dict]:
    with ENGINE.connect() as conn:
        row = conn.execute(
            text(
                "SELECT mean_vector, cov_matrix, n_sessions, updated_at "
                "FROM baselines WHERE user_id = :uid"
            ),
            {"uid": user_id},
        ).fetchone()
    if not row:
        return None
    return {
        "mean":       np.array(json.loads(row[0])),
        "cov":        np.array(json.loads(row[1])),
        "n_sessions": row[2],
        "updated_at": row[3],
    }


# ── Deviation helpers ──────────────────────────────────────────────────────

def save_deviation(
    user_id: int,
    mahal: float,
    z_scores: dict[str, float],
    label: str,
    session_id: Optional[int] = None,
) -> None:
    with ENGINE.connect() as conn:
        conn.execute(
            deviations_table.insert().values(
                user_id=user_id,
                session_id=session_id,
                mahal_distance=mahal,
                z_scores=json.dumps(z_scores),
                deviation_label=label,
                computed_at=datetime.utcnow(),
            )
        )
        conn.commit()


def get_deviation_history(user_id: int) -> pd.DataFrame:
    with ENGINE.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT mahal_distance, z_scores, deviation_label, computed_at "
                "FROM deviations WHERE user_id = :uid ORDER BY computed_at"
            ),
            {"uid": user_id},
        ).fetchall()
    if not rows:
        return pd.DataFrame()
    records = []
    for r in rows:
        records.append({
            "mahal_distance":  r[0],
            "z_scores":        json.loads(r[1]),
            "deviation_label": r[2],
            "computed_at":     r[3],
        })
    return pd.DataFrame(records)