"""
core/baseline_engine.py
Personal Baseline Engine — the scientific core of Baseline.

For each individual, this module:
  1. Computes the mean feature vector μ from baseline sessions
  2. Computes the regularized covariance matrix Σ
  3. Stores and updates these statistics incrementally
  4. Reports a baseline stability index

The baseline is NOT a classifier. It is a statistical model of
an individual's neural equilibrium — the reference distribution
from which future deviations are measured.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd
from scipy.linalg import inv

from config import (
    COVARIANCE_REGULARIZATION,
    FEATURE_COLUMNS,
    MIN_BASELINE_SESSIONS,
)
from features.extractor import extract_feature_matrix


@dataclass
class BaselineProfile:
    """
    A complete personal baseline profile for one subject.

    Attributes:
        user_name:   Subject identifier
        mean:        Feature mean vector μ  (shape: n_features,)
        cov:         Regularized covariance Σ (shape: n_features × n_features)
        cov_inv:     Precomputed Σ⁻¹ for efficient Mahalanobis computation
        n_sessions:  Number of sessions used to build this baseline
        feature_names: Ordered list of feature names matching mean/cov axes
        stability_index: [0–1] measure of how stable the baseline is
    """
    user_name:       str
    mean:            np.ndarray
    cov:             np.ndarray
    cov_inv:         np.ndarray
    n_sessions:      int
    feature_names:   list[str]
    stability_index: float


def compute_stability_index(cov: np.ndarray) -> float:
    """
    Baseline Stability Index (BSI): a normalized measure of how
    consistent the baseline distribution is.

    Computed as: BSI = 1 / (1 + mean_diagonal_variance)

    Higher values (→ 1.0) indicate a tight, stable baseline.
    Lower values (→ 0.0) indicate high inter-session variability.
    This is a heuristic index — not a formal statistical test.
    """
    diag_variances = np.diag(cov)
    mean_var = np.mean(diag_variances)
    return float(1.0 / (1.0 + mean_var))


def build_baseline(
    df: pd.DataFrame,
    user_name: str,
    regularization: float = COVARIANCE_REGULARIZATION,
) -> Optional[BaselineProfile]:
    """
    Build a personal baseline profile from a session DataFrame.

    Parameters:
        df:             DataFrame with FEATURE_COLUMNS (n_sessions rows)
        user_name:      Subject label
        regularization: Ridge term added to covariance diagonal
                        to guarantee invertibility

    Returns:
        BaselineProfile, or None if fewer than MIN_BASELINE_SESSIONS
    """
    valid_df = df[FEATURE_COLUMNS].dropna()

    if len(valid_df) < MIN_BASELINE_SESSIONS:
        return None

    X = extract_feature_matrix(valid_df)
    n, d = X.shape

    mu  = X.mean(axis=0)
    # Use ddof=1 (unbiased) for sample covariance
    cov = np.cov(X, rowvar=False, ddof=1)

    # Regularize: add λI to ensure Σ is positive-definite
    cov_reg = cov + regularization * np.eye(d)

    try:
        cov_inv = inv(cov_reg)
    except np.linalg.LinAlgError:
        # Fallback: use diagonal-only (assumes feature independence)
        diag = np.diag(cov_reg)
        diag = np.where(diag > 0, diag, regularization)
        cov_inv = np.diag(1.0 / diag)

    stability = compute_stability_index(cov_reg)

    return BaselineProfile(
        user_name=user_name,
        mean=mu,
        cov=cov_reg,
        cov_inv=cov_inv,
        n_sessions=n,
        feature_names=FEATURE_COLUMNS,
        stability_index=stability,
    )


def incremental_update(
    profile: BaselineProfile,
    new_session_vector: np.ndarray,
    regularization: float = COVARIANCE_REGULARIZATION,
) -> BaselineProfile:
    """
    Update a baseline profile with a single new session using
    Welford's online algorithm for numerical stability.

    This allows longitudinal baseline drift to be tracked without
    recomputing from scratch.
    """
    n = profile.n_sessions
    old_mu = profile.mean

    # Welford's online mean update
    new_n  = n + 1
    new_mu = old_mu + (new_session_vector - old_mu) / new_n

    # Approximate covariance update (rank-1 update heuristic)
    delta_old = new_session_vector - old_mu
    delta_new = new_session_vector - new_mu
    d = len(old_mu)
    new_cov = (
        (n - 1) * profile.cov
        + np.outer(delta_old, delta_new)
    ) / max(new_n - 1, 1)

    new_cov_reg = new_cov + regularization * np.eye(d)

    try:
        new_cov_inv = inv(new_cov_reg)
    except np.linalg.LinAlgError:
        new_cov_inv = profile.cov_inv  # keep previous if update fails

    return BaselineProfile(
        user_name=profile.user_name,
        mean=new_mu,
        cov=new_cov_reg,
        cov_inv=new_cov_inv,
        n_sessions=new_n,
        feature_names=profile.feature_names,
        stability_index=compute_stability_index(new_cov_reg),
    )