"""
preprocessing/preprocessor.py
Handles normalization, smoothing, validation, and optional EDF loading.
All functions are stateless and return new DataFrames — no in-place mutation.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.ndimage import uniform_filter1d

from config import FEATURE_COLUMNS, SESSION_COLUMN


# ── Validation ─────────────────────────────────────────────────────────────

def validate_feature_dataframe(df: pd.DataFrame) -> tuple[bool, str]:
    """
    Check that the dataframe has all required columns and no all-NaN rows.
    Returns (is_valid, message).
    """
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        return False, f"Missing columns: {missing}"
    if df[FEATURE_COLUMNS].isnull().all(axis=1).any():
        return False, "One or more rows contain only NaN values."
    return True, "OK"


# ── Normalization ──────────────────────────────────────────────────────────

def z_normalize(df: pd.DataFrame) -> pd.DataFrame:
    """
    Z-score normalize feature columns across all sessions.
    Uses population statistics (ddof=0) for normalization.
    Non-feature columns (e.g., session) are preserved unchanged.
    """
    result = df.copy()
    for col in FEATURE_COLUMNS:
        if col in result.columns:
            mu = result[col].mean()
            sigma = result[col].std(ddof=0)
            if sigma > 1e-9:
                result[col] = (result[col] - mu) / sigma
            else:
                result[col] = 0.0  # constant feature — no variance
    return result


def min_max_normalize(df: pd.DataFrame) -> pd.DataFrame:
    """
    Min-max scale feature columns to [0, 1].
    Useful for visualization; not recommended for Mahalanobis computation.
    """
    result = df.copy()
    for col in FEATURE_COLUMNS:
        if col in result.columns:
            lo, hi = result[col].min(), result[col].max()
            rng = hi - lo
            if rng > 1e-9:
                result[col] = (result[col] - lo) / rng
            else:
                result[col] = 0.0
    return result


# ── Smoothing ──────────────────────────────────────────────────────────────

def temporal_smooth(df: pd.DataFrame, window: int = 3) -> pd.DataFrame:
    """
    Apply a uniform (box) filter along the session axis for each feature.
    This reduces session-to-session noise without distorting the mean.
    window: number of neighboring sessions to average over.
    """
    result = df.copy()
    for col in FEATURE_COLUMNS:
        if col in result.columns:
            result[col] = uniform_filter1d(
                result[col].values.astype(float),
                size=window,
                mode="nearest",
            )
    return result


# ── Outlier removal ────────────────────────────────────────────────────────

def remove_outlier_sessions(
    df: pd.DataFrame, z_threshold: float = 4.0
) -> pd.DataFrame:
    """
    Drop sessions where any feature exceeds z_threshold standard deviations
    from its mean. This prevents single corrupted sessions from skewing baselines.
    """
    result = df.copy()
    mask = pd.Series([True] * len(result), index=result.index)
    for col in FEATURE_COLUMNS:
        if col in result.columns:
            mu = result[col].mean()
            sigma = result[col].std(ddof=0)
            if sigma > 1e-9:
                z = (result[col] - mu).abs() / sigma
                mask &= z <= z_threshold
    return result[mask].reset_index(drop=True)


# ── EDF loader (optional, requires MNE) ────────────────────────────────────

def load_edf_to_feature_df(edf_path: str) -> pd.DataFrame:
    """
    Load an EDF file and extract band power features per epoch.
    Requires MNE to be installed. Falls back gracefully if not available.

    Returns a DataFrame in the same format as the CSV feature files.
    """
    try:
        import mne  # type: ignore
    except ImportError:
        raise ImportError(
            "MNE is required for EDF loading. "
            "Install it with: pip install mne"
        )

    raw = mne.io.read_raw_edf(edf_path, preload=True, verbose=False)
    raw.filter(0.5, 45.0, verbose=False)

    epochs = mne.make_fixed_length_epochs(raw, duration=2.0, verbose=False)
    picks_T7 = mne.pick_channels(raw.info["ch_names"], include=["T7"])
    picks_T8 = mne.pick_channels(raw.info["ch_names"], include=["T8"])

    from features.extractor import compute_band_power_from_signal

    records = []
    for i, epoch in enumerate(epochs.get_data()):
        sfreq = raw.info["sfreq"]
        row = {"session": i}
        for band, (lo, hi) in [
            ("alpha", (8, 13)), ("beta", (13, 30)), ("theta", (4, 8))
        ]:
            if picks_T7:
                row[f"{band}_T7"] = compute_band_power_from_signal(
                    epoch[picks_T7[0]], sfreq, lo, hi
                )
            if picks_T8:
                row[f"{band}_T8"] = compute_band_power_from_signal(
                    epoch[picks_T8[0]], sfreq, lo, hi
                )
        records.append(row)

    return pd.DataFrame(records)