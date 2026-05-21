"""
evaluation/classification.py
Experiment B — Downstream classification improvement.

Cross-subject setup: all subjects' sessions are pooled and a shared classifier
is trained. Personal alignment reduces inter-subject feature variability so the
pooled classifier generalises better.

Without alignment, subject A's alpha_T7 = 0.8 and subject B's alpha_T7 = 1.5
look like different features. After personal z-score alignment, both map to
their individual z-scores, making the space comparable across people.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score

from utils.synthetic import generate_subject_sessions, SUBJECT_ARCHETYPES
from core.baseline_engine import build_baseline
from adaptation.z_score import ZScoreAdapter
from adaptation.coral import CoralAdapter
from adaptation.moving_average import MovingAverageAdapter
from config import FEATURE_COLUMNS


def _cross_subject_cv(
    X: np.ndarray, y: np.ndarray, seed: int
) -> tuple[float, float]:
    """5-fold stratified CV, no extra scaling (alignment is the normalisation)."""
    kf  = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    accs, f1s = [], []
    for tr, te in kf.split(X, y):
        clf = LogisticRegression(max_iter=1000, random_state=seed)
        clf.fit(X[tr], y[tr])
        yp = clf.predict(X[te])
        accs.append(accuracy_score(y[te], yp))
        f1s.append(f1_score(y[te], yp, zero_division=0))
    return float(np.mean(accs)), float(np.mean(f1s))


def run_classification_experiment(
    n_subjects: int = 10,
    n_sessions: int = 40,
    seed: int = 42,
) -> dict:
    """
    Pool sessions across subjects and evaluate binary classification (stable vs.
    shifted) with and without personal alignment.

    The key hypothesis: inter-subject variability in raw features hurts a
    population-level classifier; personal alignment reduces this variability,
    improving pooled accuracy without fitting a per-subject model.
    """
    rng = np.random.default_rng(seed)
    archetypes = list(SUBJECT_ARCHETYPES.keys())

    # Accumulators for pooled cross-subject dataset
    X_raw_pool:   list[np.ndarray] = []
    X_z_pool:     list[np.ndarray] = []
    X_coral_pool: list[np.ndarray] = []
    X_ma_pool:    list[np.ndarray] = []
    y_pool:       list[np.ndarray] = []

    per_subject_rows = []

    for i in range(n_subjects):
        archetype = archetypes[i % len(archetypes)]
        s = int(rng.integers(0, 10000))

        half = n_sessions // 2

        # Resting-state sessions (label 0)
        df_rest = generate_subject_sessions(
            archetype, n_sessions=half, seed=s, include_shift=False
        )
        # Shifted-state sessions (label 1) — shift from session 0
        df_shift = generate_subject_sessions(
            archetype, n_sessions=half, seed=s + 1,
            include_shift=True, shift_start=0,
        )

        X_rest  = df_rest[FEATURE_COLUMNS].values.astype(float)
        X_shift = df_shift[FEATURE_COLUMNS].values.astype(float)
        X_subj  = np.vstack([X_rest, X_shift])
        y_subj  = np.array([0] * len(X_rest) + [1] * len(X_shift))

        # Build personal profile from resting sessions only
        profile = build_baseline(df_rest, user_name=f"subj_{i}")
        if profile is None:
            continue

        # Z-score alignment
        z = ZScoreAdapter(profile)
        X_z = np.stack([z.transform(x) for x in X_subj])

        # CORAL alignment (fit on resting sessions)
        coral = CoralAdapter(profile, source_data=X_rest)
        X_coral = np.stack([coral.transform(x) for x in X_subj])

        # Moving-average alignment
        ma = MovingAverageAdapter(profile, alpha=0.1)
        X_ma = np.stack([ma.transform(x) for x in X_subj])

        X_raw_pool.append(X_subj)
        X_z_pool.append(X_z)
        X_coral_pool.append(X_coral)
        X_ma_pool.append(X_ma)
        y_pool.append(y_subj)

        per_subject_rows.append({"subject_id": f"S{i+1:02d}", "archetype": archetype})

    if not X_raw_pool:
        return {"experiment": "B — Classification Improvement", "error": "no_data"}

    # Concatenate across subjects
    X_raw_all   = np.vstack(X_raw_pool)
    X_z_all     = np.vstack(X_z_pool)
    X_coral_all = np.vstack(X_coral_pool)
    X_ma_all    = np.vstack(X_ma_pool)
    y_all       = np.concatenate(y_pool)

    # Cross-subject 5-fold CV
    acc_raw,   f1_raw   = _cross_subject_cv(X_raw_all,   y_all, seed)
    acc_z,     f1_z     = _cross_subject_cv(X_z_all,     y_all, seed)
    acc_coral, f1_coral = _cross_subject_cv(X_coral_all, y_all, seed)
    acc_ma,    f1_ma    = _cross_subject_cv(X_ma_all,    y_all, seed)

    def pp(a: float, b: float) -> float:
        return round((b - a) * 100, 2)

    return {
        "experiment":      "B — Classification Improvement",
        "setting":         "Cross-subject pooled, 5-fold stratified CV",
        "downstream_model": "Logistic Regression (no population scaler)",
        "n_subjects":      len(X_raw_pool),
        "n_sessions":      n_sessions,
        "mean_accuracy": {
            "raw":            round(acc_raw,   4),
            "zscore":         round(acc_z,     4),
            "coral":          round(acc_coral, 4),
            "moving_average": round(acc_ma,    4),
        },
        "mean_f1": {
            "raw":            round(f1_raw,   4),
            "zscore":         round(f1_z,     4),
            "coral":          round(f1_coral, 4),
            "moving_average": round(f1_ma,    4),
        },
        "mean_improvement_pct": {
            "zscore":         pp(acc_raw, acc_z),
            "coral":          pp(acc_raw, acc_coral),
            "moving_average": pp(acc_raw, acc_ma),
        },
        "per_subject": per_subject_rows,
        "chart_data": {
            "methods":     ["raw", "zscore", "coral", "moving_average"],
            "accuracy":    [round(acc_raw, 4), round(acc_z, 4),
                            round(acc_coral, 4), round(acc_ma, 4)],
            "f1":          [round(f1_raw, 4), round(f1_z, 4),
                            round(f1_coral, 4), round(f1_ma, 4)],
        },
    }
