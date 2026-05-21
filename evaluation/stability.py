"""
evaluation/stability.py
Experiment A — Session stability improvement.

Measures how consistently the deviation scoring system behaves across sessions.
Stability = low variance in deviation scores from stable (non-shifted) sessions.

Metric:
    Variance of Mahalanobis D(x) across held-out stable sessions.
    Low variance = system reliably reads stable sessions as stable.

Comparison:
    - No alignment (raw features, identity normalization)
    - Z-score alignment (personal μ, σ)
    - CORAL alignment (personal covariance)
    - Moving-average adaptation
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from utils.synthetic import generate_subject_sessions, SUBJECT_ARCHETYPES
from core.baseline_engine import build_baseline
from core.deviation_engine import compute_mahalanobis, compute_deviation_series
from adaptation.z_score import ZScoreAdapter
from adaptation.coral import CoralAdapter
from adaptation.moving_average import MovingAverageAdapter
from config import FEATURE_COLUMNS


def _mahal_variance(X: np.ndarray, profile) -> float:
    """Variance of Mahalanobis distances across sessions. Lower = more stable."""
    distances = [
        compute_mahalanobis(x, profile.mean, profile.cov_inv)
        for x in X
    ]
    return float(np.var(distances, ddof=1))


def _aligned_mahal_variance(X_aligned: np.ndarray, profile) -> float:
    """Compute Mahalanobis variance after alignment (profile stays same)."""
    return _mahal_variance(X_aligned, profile)


def run_stability_experiment(
    n_subjects: int = 8,
    n_sessions: int = 30,
    seed: int = 42,
) -> dict:
    """
    Stability experiment: does alignment reduce variance of deviation scores
    across stable sessions?

    A stable, aligned system should produce consistent D(x) scores when
    the subject is in their baseline cognitive state.
    """
    rng = np.random.default_rng(seed)
    archetypes = list(SUBJECT_ARCHETYPES.keys())

    dvar: dict[str, list[float]] = {
        "raw":            [],
        "zscore":         [],
        "coral":          [],
        "moving_average": [],
    }

    subject_details = []

    for i in range(n_subjects):
        archetype = archetypes[i % len(archetypes)]
        subj_seed = int(rng.integers(0, 10000))

        # Train sessions: no shift (stable baseline)
        df = generate_subject_sessions(
            subject_name=archetype,
            n_sessions=n_sessions,
            include_shift=False,
            seed=subj_seed,
        )

        split = max(5, int(n_sessions * 0.6))
        train_df = df.iloc[:split]
        test_df  = df.iloc[split:]

        X_train = train_df[FEATURE_COLUMNS].values.astype(float)
        X_test  = test_df[FEATURE_COLUMNS].values.astype(float)

        profile = build_baseline(train_df, user_name=f"subject_{i}")
        if profile is None:
            continue

        # Raw: Mahalanobis variance without any session-level adaptation
        v_raw = _mahal_variance(X_test, profile)

        # Z-score: normalize each session, then compute Mahalanobis
        z_adapter = ZScoreAdapter(profile)
        X_z = np.stack([z_adapter.transform(x) for x in X_test])
        # Rebuild a unit-covariance profile for Mahalanobis in z-space
        from core.baseline_engine import BaselineProfile
        from scipy.linalg import inv
        d = X_z.shape[1]
        z_profile = BaselineProfile(
            user_name=f"z_{i}",
            mean=np.zeros(d),
            cov=np.eye(d),
            cov_inv=np.eye(d),
            n_sessions=profile.n_sessions,
            feature_names=FEATURE_COLUMNS,
            stability_index=profile.stability_index,
        )
        v_z = _mahal_variance(X_z, z_profile)

        # CORAL
        coral = CoralAdapter(profile, source_data=X_train)
        X_coral = np.stack([coral.transform(x) for x in X_test])
        v_coral = _mahal_variance(X_coral, z_profile)

        # Moving average
        ma = MovingAverageAdapter(profile, alpha=0.1)
        X_ma = np.stack([ma.transform(x) for x in X_test])
        v_ma = _mahal_variance(X_ma, z_profile)

        dvar["raw"].append(v_raw)
        dvar["zscore"].append(v_z)
        dvar["coral"].append(v_coral)
        dvar["moving_average"].append(v_ma)

        subject_details.append({
            "subject_id":      f"S{i+1:02d}",
            "archetype":       archetype,
            "stability_index": round(profile.stability_index, 4),
            "dvar_raw":        round(v_raw,   4),
            "dvar_zscore":     round(v_z,     4),
            "dvar_coral":      round(v_coral,  4),
            "dvar_ma":         round(v_ma,    4),
            "reduction_zscore": round((v_raw - v_z)    / max(v_raw, 1e-9) * 100, 2),
            "reduction_coral":  round((v_raw - v_coral) / max(v_raw, 1e-9) * 100, 2),
            "reduction_ma":     round((v_raw - v_ma)   / max(v_raw, 1e-9) * 100, 2),
        })

    def mean_var(key: str) -> float:
        return round(float(np.mean(dvar[key])) if dvar[key] else 0.0, 4)

    def mean_reduction(key: str) -> float:
        raw  = np.array(dvar["raw"])
        adj  = np.array(dvar[key])
        if raw.mean() < 1e-9:
            return 0.0
        return round(float((raw.mean() - adj.mean()) / raw.mean() * 100), 2)

    return {
        "experiment":      "A — Session Deviation Variance Reduction",
        "metric":          "Variance of Mahalanobis D(x) across stable test sessions",
        "interpretation":  "Lower = more stable, consistent deviation scoring",
        "n_subjects":      n_subjects,
        "n_sessions":      n_sessions,
        "mean_deviation_variance": {
            "raw":            mean_var("raw"),
            "zscore":         mean_var("zscore"),
            "coral":          mean_var("coral"),
            "moving_average": mean_var("moving_average"),
        },
        "variance_reduction_pct": {
            "zscore":         mean_reduction("zscore"),
            "coral":          mean_reduction("coral"),
            "moving_average": mean_reduction("moving_average"),
        },
        "per_subject": subject_details,
        "adapter_series": {
            "subjects":       [d["subject_id"]   for d in subject_details],
            "raw":            [d["dvar_raw"]      for d in subject_details],
            "zscore":         [d["dvar_zscore"]   for d in subject_details],
            "coral":          [d["dvar_coral"]    for d in subject_details],
            "moving_average": [d["dvar_ma"]       for d in subject_details],
        },
    }
