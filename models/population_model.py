"""
models/population_model.py
Population-level (inter-subject) baseline model.

This module builds a SINGLE generalized baseline from all available
subjects and demonstrates why it fails to represent any individual.

This is intentionally a naive model — it exists to prove the scientific
point that population averages distort individual interpretation.
It is NOT positioned as a valid clinical or research tool.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from config import COVARIANCE_REGULARIZATION, FEATURE_COLUMNS
from core.baseline_engine import BaselineProfile, build_baseline
from core.deviation_engine import compute_deviation, DeviationResult


@dataclass
class PopulationComparison:
    """
    Side-by-side comparison of personal vs population deviation results
    for the same input session.
    """
    personal_result:    DeviationResult
    population_result:  DeviationResult
    personal_profile:   BaselineProfile
    population_profile: BaselineProfile


def build_population_baseline(
    subject_dataframes: dict[str, pd.DataFrame],
    population_name: str = "population",
) -> BaselineProfile:
    """
    Concatenate all subjects' sessions into a single DataFrame
    and build a baseline from the pooled data.

    This is the 'population model': it computes a single μ and Σ
    from all individuals, ignoring inter-subject variability.

    Parameters:
        subject_dataframes: dict mapping subject_name → session DataFrame

    Returns:
        A BaselineProfile representing the cross-subject average
    """
    all_sessions = pd.concat(
        list(subject_dataframes.values()),
        ignore_index=True,
    )
    profile = build_baseline(all_sessions, user_name=population_name)
    if profile is None:
        # Fallback: compute manually without MIN_BASELINE_SESSIONS constraint
        X = all_sessions[FEATURE_COLUMNS].dropna().values.astype(float)
        mu  = X.mean(axis=0)
        cov = np.cov(X, rowvar=False, ddof=1) + COVARIANCE_REGULARIZATION * np.eye(X.shape[1])
        from scipy.linalg import inv
        cov_inv = inv(cov)
        from core.baseline_engine import compute_stability_index
        profile = BaselineProfile(
            user_name=population_name,
            mean=mu,
            cov=cov,
            cov_inv=cov_inv,
            n_sessions=len(X),
            feature_names=FEATURE_COLUMNS,
            stability_index=compute_stability_index(cov),
        )
    return profile


def compare_personal_vs_population(
    x: np.ndarray,
    personal_profile: BaselineProfile,
    population_profile: BaselineProfile,
) -> PopulationComparison:
    """
    For a given session feature vector x, compute deviation scores
    under both the personal baseline and the population baseline.

    The difference in scores illustrates why personalized baselines
    are necessary: the same neural state can look 'normal' under a
    population model but 'anomalous' under a personal one (or vice versa).
    """
    personal_result   = compute_deviation(x, personal_profile)
    population_result = compute_deviation(x, population_profile)
    return PopulationComparison(
        personal_result=personal_result,
        population_result=population_result,
        personal_profile=personal_profile,
        population_profile=population_profile,
    )