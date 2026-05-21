"""
features/extractor.py
EEG feature extraction from raw signals or pre-processed DataFrames.
Implements PSD-based features, differential entropy, band power ratios,
alpha asymmetry, and temporal variance.
All spectral estimates use Welch's method for robustness against noise.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.signal import welch

from config import BANDS, FEATURE_COLUMNS


# ── Spectral helpers ───────────────────────────────────────────────────────

def compute_band_power_from_signal(
    signal: np.ndarray,
    sfreq: float,
    low_hz: float,
    high_hz: float,
    nperseg: int = 256,
) -> float:
    """
    Estimate power spectral density via Welch's method,
    then integrate over [low_hz, high_hz].
    Returns absolute band power in μV²/Hz units (or arbitrary if signal
    is already normalized).
    """
    freqs, psd = welch(signal, fs=sfreq, nperseg=min(nperseg, len(signal)))
    idx = np.logical_and(freqs >= low_hz, freqs <= high_hz)
    if not np.any(idx):
        return 0.0
    # Trapezoidal integration for accuracy
    return float(np.trapz(psd[idx], freqs[idx]))


def compute_differential_entropy(
    signal: np.ndarray,
    sfreq: float,
    low_hz: float,
    high_hz: float,
) -> float:
    """
    Differential entropy for a band: DE = 0.5 * log(2πe * σ²)
    Estimated from the band-passed signal variance.
    This is an approximation valid under a Gaussian assumption,
    commonly used in EEG affective computing literature.
    """
    power = compute_band_power_from_signal(signal, sfreq, low_hz, high_hz)
    if power <= 0:
        return 0.0
    return 0.5 * np.log(2 * np.pi * np.e * power)


# ── DataFrame-level feature computation ───────────────────────────────────

def compute_alpha_asymmetry(df: pd.DataFrame) -> pd.Series:
    """
    Alpha asymmetry = alpha_T8 - alpha_T7 (log-transformed powers).
    Positive values indicate right-dominant alpha (associated with
    approach motivation in frontal recordings; here used as a proxy).
    If values are non-positive after any normalization, we add a small
    offset before log transform.
    """
    eps = 1e-9
    left  = np.log(df["alpha_T7"].clip(lower=eps))
    right = np.log(df["alpha_T8"].clip(lower=eps))
    return right - left


def compute_theta_alpha_ratio(df: pd.DataFrame) -> pd.Series:
    """
    Theta/Alpha ratio: elevated ratio associated with increased cognitive load.
    Computed as average of T7 and T8 channels.
    """
    eps = 1e-9
    theta = (df["theta_T7"] + df["theta_T8"]) / 2
    alpha = (df["alpha_T7"] + df["alpha_T8"]) / 2
    return theta / alpha.clip(lower=eps)


def compute_beta_alpha_ratio(df: pd.DataFrame) -> pd.Series:
    """
    Beta/Alpha ratio: associated with alertness and cortical arousal.
    """
    eps = 1e-9
    beta  = (df["beta_T7"]  + df["beta_T8"])  / 2
    alpha = (df["alpha_T7"] + df["alpha_T8"]) / 2
    return beta / alpha.clip(lower=eps)


def compute_temporal_variance(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    """
    Rolling variance over each feature across sessions.
    Captures instability in the signal over time.
    """
    return df[FEATURE_COLUMNS].rolling(window=window, min_periods=2).var()


def enrich_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived features to the base feature DataFrame.
    These extended features improve deviation sensitivity but are
    kept separate from FEATURE_COLUMNS so they don't break CSV validation.
    """
    result = df.copy()
    result["alpha_asymmetry"]    = compute_alpha_asymmetry(df)
    result["theta_alpha_ratio"]  = compute_theta_alpha_ratio(df)
    result["beta_alpha_ratio"]   = compute_beta_alpha_ratio(df)
    return result


def extract_feature_vector(row: pd.Series) -> np.ndarray:
    """
    Extract a 1D numpy feature vector from a single session row.
    Only uses the base FEATURE_COLUMNS for baseline and deviation computation
    to ensure dimensional consistency.
    """
    return row[FEATURE_COLUMNS].values.astype(float)


def extract_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    Extract a 2D feature matrix (n_sessions × n_features).
    """
    return df[FEATURE_COLUMNS].values.astype(float)