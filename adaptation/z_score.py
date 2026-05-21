"""
adaptation/z_score.py
Z-score normalization adapter.

The simplest alignment strategy: subtract the personal mean and divide by
personal standard deviation. Fast, interpretable, and effective when the
main source of session drift is a shift in feature magnitude rather than
covariance structure.

Limitations: assumes feature independence; does not correct for correlated
feature drift or inter-session covariance shifts.
"""

from __future__ import annotations
import numpy as np
from adaptation.base import BaseAdapter
from core.baseline_engine import BaselineProfile


class ZScoreAdapter(BaseAdapter):
    """
    Per-feature z-score normalization using the subject's personal baseline.

    z_i = (x_i - μ_i) / σ_i

    where μ = profile.mean, σ = sqrt(diag(profile.cov)).
    """

    def __init__(self, profile: BaselineProfile):
        self.mu  = profile.mean
        self.std = np.sqrt(np.diag(profile.cov))
        self.std = np.where(self.std > 1e-9, self.std, 1.0)

    def transform(self, x: np.ndarray) -> np.ndarray:
        return (x - self.mu) / self.std
