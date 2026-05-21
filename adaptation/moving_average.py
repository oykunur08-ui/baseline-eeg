"""
adaptation/moving_average.py
Exponential Moving Average (EMA) recalibration adapter.

Tracks gradual longitudinal drift by maintaining an online exponential
moving average of the session statistics. The baseline μ and Σ are
updated incrementally after each session, giving more weight to recent
history.

This is the most wearable-deployment-friendly strategy: it requires no
batch data and handles slow drift without full re-fitting.

Limitations:
    - Does not handle abrupt distribution shifts well.
    - Alpha parameter controls drift sensitivity vs stability tradeoff.
    - Does not explicitly correct covariance structure.
"""

from __future__ import annotations
import numpy as np
from adaptation.base import BaseAdapter
from core.baseline_engine import BaselineProfile


class MovingAverageAdapter(BaseAdapter):
    """
    Online EMA recalibration with per-feature z-score in the updated space.

    Parameters
    ----------
    profile : BaselineProfile
        The initial personal baseline.
    alpha : float
        EMA decay factor in [0, 1]. Higher = more weight to recent sessions.
        Typical: 0.05–0.2 for slow drift; 0.3–0.5 for faster adaptation.
    """

    def __init__(self, profile: BaselineProfile, alpha: float = 0.1):
        self.alpha = alpha
        self.mu  = profile.mean.copy()
        self.var = np.diag(profile.cov).copy()

    def update(self, x: np.ndarray) -> None:
        """Update the running statistics with a new observation."""
        self.mu  = (1 - self.alpha) * self.mu  + self.alpha * x
        self.var = (1 - self.alpha) * self.var + self.alpha * (x - self.mu) ** 2

    def transform(self, x: np.ndarray) -> np.ndarray:
        std = np.where(self.var > 1e-9, np.sqrt(self.var), 1.0)
        aligned = (x - self.mu) / std
        self.update(x)
        return aligned
