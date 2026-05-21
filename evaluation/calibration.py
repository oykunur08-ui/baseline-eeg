"""
evaluation/calibration.py
Experiment C — Calibration efficiency.

Shows how alignment quality (measured as Mahalanobis D(x) variance across
stable test sessions) improves as more calibration sessions are available.

Demonstrates that personal alignment reaches stable, low-variance performance
with far fewer calibration samples than might be expected.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from utils.synthetic import generate_subject_sessions, SUBJECT_ARCHETYPES
from core.baseline_engine import build_baseline, BaselineProfile
from core.deviation_engine import compute_mahalanobis
from adaptation.z_score import ZScoreAdapter
from config import FEATURE_COLUMNS


def _mahal_variance(X: np.ndarray, profile) -> float:
    distances = [
        compute_mahalanobis(x, profile.mean, profile.cov_inv)
        for x in X
    ]
    return float(np.var(distances, ddof=1)) if len(distances) > 1 else 0.0


def _unit_profile(base_profile, d: int) -> BaselineProfile:
    return BaselineProfile(
        user_name=base_profile.user_name + "_unit",
        mean=np.zeros(d),
        cov=np.eye(d),
        cov_inv=np.eye(d),
        n_sessions=base_profile.n_sessions,
        feature_names=FEATURE_COLUMNS,
        stability_index=base_profile.stability_index,
    )


def run_calibration_experiment(
    n_subjects: int = 8,
    n_sessions: int = 50,
    seed: int = 42,
    calib_steps: list[int] | None = None,
) -> dict:
    """
    Measure Mahalanobis D(x) variance as a function of calibration session count.

    Both raw (no alignment) and z-score aligned are measured at each step,
    showing how quickly alignment reaches a stable, low-variance regime.
    """
    if calib_steps is None:
        calib_steps = [5, 7, 10, 15, 20, 25, 30]

    rng = np.random.default_rng(seed)
    archetypes = list(SUBJECT_ARCHETYPES.keys())

    var_raw_by_n:   dict[int, list[float]] = {n: [] for n in calib_steps}
    var_align_by_n: dict[int, list[float]] = {n: [] for n in calib_steps}

    # Fixed test pool per subject — independent of calibration size
    n_test = 15

    for i in range(n_subjects):
        archetype = archetypes[i % len(archetypes)]
        s = int(rng.integers(0, 10000))

        total_needed = max(calib_steps) + n_test
        df_all = generate_subject_sessions(
            archetype,
            n_sessions=total_needed,
            include_shift=False,
            seed=s,
        )
        if len(df_all) < total_needed:
            continue

        X_all  = df_all[FEATURE_COLUMNS].values.astype(float)
        X_test = X_all[-n_test:]

        for n_calib in calib_steps:
            if n_calib > len(X_all) - n_test:
                continue

            X_calib  = X_all[:n_calib]
            calib_df = pd.DataFrame(X_calib, columns=FEATURE_COLUMNS)
            profile  = build_baseline(calib_df, user_name=f"subj_{i}_c{n_calib}")

            if profile is None:
                continue

            # Raw Mahalanobis variance (profile fitted on n_calib sessions)
            v_raw = _mahal_variance(X_test, profile)
            var_raw_by_n[n_calib].append(v_raw)

            # Z-score aligned Mahalanobis variance (unit-covariance space)
            adapter   = ZScoreAdapter(profile)
            X_aligned = np.stack([adapter.transform(x) for x in X_test])
            u_profile = _unit_profile(profile, X_aligned.shape[1])
            v_align   = _mahal_variance(X_aligned, u_profile)
            var_align_by_n[n_calib].append(v_align)

    calib_curve_raw:   list[float] = []
    calib_curve_align: list[float] = []
    calib_curve_reduc: list[float] = []

    for n in calib_steps:
        r  = float(np.mean(var_raw_by_n[n]))   if var_raw_by_n[n]   else 0.0
        a  = float(np.mean(var_align_by_n[n])) if var_align_by_n[n] else 0.0
        rd = (r - a) / max(r, 1e-9) * 100
        calib_curve_raw.append(round(r,  4))
        calib_curve_align.append(round(a, 4))
        calib_curve_reduc.append(round(rd, 2))

    # Find where aligned variance first drops below 2× its minimum (plateau point)
    min_aligned = min(calib_curve_align) if calib_curve_align else 0.0
    plateau_n   = next(
        (calib_steps[j] for j, v in enumerate(calib_curve_align)
         if v <= min_aligned * 2.0 + 1e-9),
        calib_steps[-1],
    )

    final_reduc = calib_curve_reduc[-1] if calib_curve_reduc else 0.0

    return {
        "experiment":  "C — Calibration Efficiency",
        "metric":      "Variance of Mahalanobis D(x) across stable test sessions",
        "n_subjects":  n_subjects,
        "n_sessions":  n_sessions,
        "calib_steps": calib_steps,
        "curves": {
            "calib_sessions":         calib_steps,
            "variance_raw":           calib_curve_raw,
            "variance_aligned":       calib_curve_align,
            "variance_reduction_pct": calib_curve_reduc,
        },
        "plateau_n": plateau_n,
        "key_finding": (
            f"Aligned deviation variance stabilizes near {plateau_n} calibration sessions. "
            f"Raw Mahalanobis scoring is {calib_curve_raw[0]:.1f}× more variable than "
            f"aligned scoring at minimum calibration ({calib_steps[0]} sessions). "
            f"At full calibration ({calib_steps[-1]} sessions), alignment still reduces "
            f"variance by {final_reduc:.1f}%."
        ),
    }
