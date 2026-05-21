"""
sdk/client.py
Baseline SDK — the primary interface for embedding alignment.

Usage:
    from sdk import Baseline

    bl = Baseline()
    bl.fit("alice", sessions_df)
    result = bl.transform("alice", new_session_vector)
    print(result.mahal_distance, result.deviation_label)

    report = bl.evaluate("alice", held_out_df)
    bl.get_session_reliability("alice")
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass
from typing import Literal, Optional

import numpy as np
import pandas as pd
from scipy.linalg import inv

from config import FEATURE_COLUMNS, MIN_BASELINE_SESSIONS
from core.baseline_engine import build_baseline, compute_stability_index, BaselineProfile
from core.deviation_engine import (
    compute_deviation, compute_deviation_series, DeviationResult,
)
from database.db import (
    get_or_create_user, get_sessions_for_user,
    save_baseline, load_baseline, insert_session,
)
from adaptation.coral import CoralAdapter
from adaptation.moving_average import MovingAverageAdapter
from adaptation.z_score import ZScoreAdapter


AdapterName = Literal["none", "zscore", "coral", "moving_average"]


@dataclass
class TransformResult:
    user_id:             str
    adapter:             str
    raw_features:        np.ndarray
    aligned_features:    np.ndarray
    mahal_distance:      float
    deviation_label:     str
    z_scores:            dict[str, float]
    feature_contributions: list[tuple[str, float]]


@dataclass
class EvaluationReport:
    user_id:            str
    n_sessions:         int
    stability_index:    float
    mean_deviation:     float
    variance_raw:       float
    variance_aligned:   float
    variance_reduction: float
    session_reliabilities: list[float]
    adapter:            str


class Baseline:
    """
    Lightweight personalization layer for wearable EEG pipelines.

    Learns a subject-specific statistical baseline (μ, Σ) from calibration
    sessions and uses it to align future sessions into a stable embedding space.
    Reduces longitudinal drift and improves downstream model robustness.

    Parameters
    ----------
    adapter : str
        Alignment strategy. One of:
        - 'zscore'       : per-feature z-score normalization (default, fast)
        - 'coral'        : CORAL covariance alignment
        - 'moving_average': exponential moving-average recalibration
        - 'none'         : raw features, no alignment
    min_sessions : int
        Minimum calibration sessions before fit() is accepted.
    """

    def __init__(
        self,
        adapter: AdapterName = "zscore",
        min_sessions: int = MIN_BASELINE_SESSIONS,
    ):
        self.adapter_name = adapter
        self.min_sessions = min_sessions
        self._profiles: dict[str, BaselineProfile] = {}

    # ── Fit ──────────────────────────────────────────────────────────────────

    def fit(
        self,
        user_id: str,
        data: pd.DataFrame,
        persist: bool = True,
    ) -> "Baseline":
        """
        Learn a personal baseline from calibration sessions.

        Parameters
        ----------
        user_id : str
            Subject identifier (any string).
        data : pd.DataFrame
            DataFrame with FEATURE_COLUMNS columns. Each row = one session.
        persist : bool
            If True, saves baseline to SQLite for cross-session persistence.

        Returns
        -------
        self (for chaining)
        """
        profile = build_baseline(data, user_name=user_id)
        if profile is None:
            raise ValueError(
                f"Not enough sessions to fit baseline for '{user_id}'. "
                f"Need ≥ {self.min_sessions}, got {len(data)}."
            )
        self._profiles[user_id] = profile

        if persist:
            uid = get_or_create_user(user_id)
            for _, row in data.iterrows():
                insert_session(uid, row[FEATURE_COLUMNS].tolist())
            save_baseline(uid, profile.mean, profile.cov, profile.n_sessions)

        return self

    def fit_from_db(self, user_id: str) -> "Baseline":
        """Load a previously persisted baseline from the database."""
        uid = get_or_create_user(user_id)
        bl = load_baseline(uid)
        if bl is None:
            raise ValueError(f"No persisted baseline found for '{user_id}'.")
        self._profiles[user_id] = BaselineProfile(
            user_name=user_id,
            mean=bl["mean"],
            cov=bl["cov"],
            cov_inv=inv(bl["cov"]),
            n_sessions=bl["n_sessions"],
            feature_names=FEATURE_COLUMNS,
            stability_index=compute_stability_index(bl["cov"]),
        )
        return self

    # ── Transform ─────────────────────────────────────────────────────────────

    def transform(
        self,
        user_id: str,
        features: np.ndarray | list[float],
    ) -> TransformResult:
        """
        Align a new session feature vector to the personal baseline embedding.

        Parameters
        ----------
        user_id : str
            Subject identifier.
        features : array-like, shape (n_features,)
            Raw EEG feature vector for the new session.

        Returns
        -------
        TransformResult with aligned features, deviation score, and z-scores.
        """
        profile = self._get_profile(user_id)
        x = np.asarray(features, dtype=float)

        adapter = self._make_adapter(profile)
        x_aligned = adapter.transform(x) if adapter is not None else x

        result = compute_deviation(x_aligned, profile)

        return TransformResult(
            user_id=user_id,
            adapter=self.adapter_name,
            raw_features=x,
            aligned_features=x_aligned,
            mahal_distance=result.mahal_distance,
            deviation_label=result.deviation_label,
            z_scores=result.z_scores,
            feature_contributions=result.feature_contributions,
        )

    def transform_batch(
        self,
        user_id: str,
        data: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Transform a full session DataFrame.
        Returns a DataFrame with aligned features + deviation columns.
        """
        profile = self._get_profile(user_id)
        adapter = self._make_adapter(profile)

        records = []
        for _, row in data[FEATURE_COLUMNS].iterrows():
            x = row.values.astype(float)
            x_aligned = adapter.transform(x) if adapter is not None else x
            result = compute_deviation(x_aligned, profile)
            record = {f"aligned_{f}": v for f, v in zip(FEATURE_COLUMNS, x_aligned)}
            record["mahal_distance"] = result.mahal_distance
            record["deviation_label"] = result.deviation_label
            records.append(record)

        return pd.DataFrame(records)

    # ── Evaluate ──────────────────────────────────────────────────────────────

    def evaluate(self, user_id: str, data: Optional[pd.DataFrame] = None) -> EvaluationReport:
        """
        Compute evaluation metrics for a subject's alignment quality.

        Parameters
        ----------
        user_id : str
        data : DataFrame, optional
            Held-out sessions. If None, uses all DB sessions.

        Returns
        -------
        EvaluationReport with variance reduction, stability index, reliabilities.
        """
        profile = self._get_profile(user_id)
        if data is None:
            uid = get_or_create_user(user_id)
            session_df = get_sessions_for_user(uid)
            data = pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)

        X_raw = data[FEATURE_COLUMNS].values.astype(float)
        adapter = self._make_adapter(profile)
        X_aligned = np.stack([
            adapter.transform(x) if adapter else x for x in X_raw
        ])

        var_raw     = float(np.mean(np.var(X_raw,     axis=0)))
        var_aligned = float(np.mean(np.var(X_aligned, axis=0)))
        var_reduction = (
            (var_raw - var_aligned) / var_raw * 100 if var_raw > 1e-9 else 0.0
        )

        dev_series = compute_deviation_series(data, profile)
        reliabilities = self._compute_reliabilities(dev_series)

        return EvaluationReport(
            user_id=user_id,
            n_sessions=len(data),
            stability_index=profile.stability_index,
            mean_deviation=float(dev_series["mahal_distance"].mean()),
            variance_raw=round(var_raw, 6),
            variance_aligned=round(var_aligned, 6),
            variance_reduction=round(var_reduction, 2),
            session_reliabilities=reliabilities,
            adapter=self.adapter_name,
        )

    # ── Uncertainty & Reliability ─────────────────────────────────────────────

    def get_uncertainty(self, user_id: str, features: np.ndarray) -> float:
        """
        Return a normalized uncertainty score [0, 1] for a feature vector.
        Higher = more uncertain / further from trained distribution.
        Based on normalized Mahalanobis distance.
        """
        result = self.transform(user_id, features)
        return float(min(result.mahal_distance / 8.0, 1.0))

    def get_session_reliability(self, user_id: str) -> list[dict]:
        """
        Return per-session reliability scores for all stored sessions.
        Reliability = 1 / (1 + mahal_distance).
        """
        profile = self._get_profile(user_id)
        uid = get_or_create_user(user_id)
        session_df = get_sessions_for_user(uid)
        data = pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)
        dev_series = compute_deviation_series(data, profile)
        reliabilities = self._compute_reliabilities(dev_series)
        return [
            {
                "session_index": int(i),
                "mahal_distance": round(float(dev_series["mahal_distance"].iloc[i]), 4),
                "reliability": round(r, 4),
                "deviation_label": dev_series["deviation_label"].iloc[i],
            }
            for i, r in enumerate(reliabilities)
        ]

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get_profile(self, user_id: str) -> BaselineProfile:
        if user_id not in self._profiles:
            try:
                self.fit_from_db(user_id)
            except ValueError:
                raise ValueError(
                    f"No baseline for '{user_id}'. Call fit() or fit_from_db() first."
                )
        return self._profiles[user_id]

    def _make_adapter(self, profile: BaselineProfile):
        if self.adapter_name == "zscore":
            return ZScoreAdapter(profile)
        elif self.adapter_name == "coral":
            return CoralAdapter(profile)
        elif self.adapter_name == "moving_average":
            return MovingAverageAdapter(profile)
        return None

    @staticmethod
    def _compute_reliabilities(dev_series: pd.DataFrame) -> list[float]:
        return [
            round(1.0 / (1.0 + d), 4)
            for d in dev_series["mahal_distance"].tolist()
        ]

    def __repr__(self) -> str:
        n = len(self._profiles)
        return f"Baseline(adapter='{self.adapter_name}', subjects_loaded={n})"
