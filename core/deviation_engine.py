"""
core/deviation_engine.py
Deviation Engine — computes how far a new session deviates from
an individual's personal baseline using Mahalanobis distance.

Also computes per-feature z-scores and ranks features by contribution
to the deviation, enabling interpretable output.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from config import DEVIATION_THRESHOLDS, FEATURE_COLUMNS
from core.baseline_engine import BaselineProfile


@dataclass
class DeviationResult:
    """
    Full output of a deviation computation for one session.

    Attributes:
        mahal_distance:     Mahalanobis distance D(x, μ, Σ)
        deviation_label:    Categorical label (stable / mild / moderate / high)
        z_scores:           Per-feature z-score dict {feature: z}
        feature_contributions: Ranked list of (feature, abs_z) tuples,
                            most deviating first
        feature_vector:     The raw input feature vector
        baseline_mean:      The baseline mean for comparison
    """
    mahal_distance:        float
    deviation_label:       str
    z_scores:              dict[str, float]
    feature_contributions: list[tuple[str, float]]
    feature_vector:        np.ndarray
    baseline_mean:         np.ndarray


def compute_mahalanobis(
    x: np.ndarray,
    mu: np.ndarray,
    cov_inv: np.ndarray,
) -> float:
    """
    Mahalanobis distance: D(x) = sqrt((x - μ)ᵀ Σ⁻¹ (x - μ))

    This accounts for feature correlations and scales each dimension
    by its variance — unlike Euclidean distance, which treats all
    features as equally scaled and independent.
    """
    diff = x - mu
    d_sq = float(diff @ cov_inv @ diff)
    # Guard against numerical errors producing tiny negative values
    return float(np.sqrt(max(d_sq, 0.0)))


def classify_deviation(distance: float) -> str:
    """
    Map a Mahalanobis distance to a categorical deviation label
    using thresholds defined in config.py.
    """
    for label, (lo, hi) in DEVIATION_THRESHOLDS.items():
        if lo <= distance < hi:
            return label
    return "high"


def compute_z_scores(
    x: np.ndarray,
    mu: np.ndarray,
    cov: np.ndarray,
    feature_names: list[str],
) -> dict[str, float]:
    """
    Per-feature z-scores: z_i = (x_i - μ_i) / σ_i
    where σ_i = sqrt(Σ_ii), the marginal standard deviation.

    Z-scores provide an interpretable per-feature view of deviation
    without the multivariate rotation of Mahalanobis distance.
    """
    std = np.sqrt(np.diag(cov))
    std = np.where(std > 1e-9, std, 1.0)  # prevent division by zero
    z = (x - mu) / std
    return {name: float(z_val) for name, z_val in zip(feature_names, z)}


def compute_deviation(
    x: np.ndarray,
    profile: BaselineProfile,
) -> DeviationResult:
    """
    Full deviation computation for a single session feature vector.

    Parameters:
        x:       Feature vector for the new session (1D, same order as profile)
        profile: The subject's personal baseline profile

    Returns:
        DeviationResult with all deviation metrics
    """
    mahal = compute_mahalanobis(x, profile.mean, profile.cov_inv)
    label = classify_deviation(mahal)
    z_scores = compute_z_scores(x, profile.mean, profile.cov, profile.feature_names)

    contributions = sorted(
        [(feat, abs(z)) for feat, z in z_scores.items()],
        key=lambda t: t[1],
        reverse=True,
    )

    return DeviationResult(
        mahal_distance=mahal,
        deviation_label=label,
        z_scores=z_scores,
        feature_contributions=contributions,
        feature_vector=x,
        baseline_mean=profile.mean,
    )


def compute_deviation_series(
    df: pd.DataFrame,
    profile: BaselineProfile,
) -> pd.DataFrame:
    """
    Compute deviation for every row in a session DataFrame.
    Useful for longitudinal drift analysis.

    Returns a DataFrame with columns:
        session, mahal_distance, deviation_label, + per-feature z-scores
    """
    records = []
    for idx, row in df[FEATURE_COLUMNS].iterrows():
        x = row.values.astype(float)
        result = compute_deviation(x, profile)
        record = {
            "session_index":  idx,
            "mahal_distance": result.mahal_distance,
            "deviation_label": result.deviation_label,
        }
        record.update({f"z_{k}": v for k, v in result.z_scores.items()})
        records.append(record)
    return pd.DataFrame(records)