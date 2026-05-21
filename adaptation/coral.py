"""
adaptation/coral.py
CORAL (CORrelation ALignment) adapter.

Aligns second-order statistics (covariance) of the new session to the
subject's personal baseline covariance. More powerful than z-score
normalization when feature correlations shift across sessions.

Method:
    Given source covariance Cs (new session) and target covariance Ct (baseline):
    x_aligned = x @ Cs^(-1/2) @ Ct^(1/2)

    This maps the source distribution's covariance to match the target's
    while preserving the first-order structure.

Reference:
    Sun & Saenko, "Return of Frustratingly Easy Domain Adaptation", AAAI 2016.
    Applied here to single-vector online alignment using the stored baseline Σ.

Limitations:
    - Requires the current session covariance, which needs ≥ n_features samples.
    - When session is a single vector (online mode), falls back to z-score.
    - Sensitive to noise when few session samples are available.
"""

from __future__ import annotations
import numpy as np
from scipy.linalg import sqrtm
from adaptation.base import BaseAdapter
from adaptation.z_score import ZScoreAdapter
from core.baseline_engine import BaselineProfile


class CoralAdapter(BaseAdapter):
    """
    CORAL-style covariance alignment.

    Fit with a batch of source features, then transform new vectors.
    Falls back to z-score for single-vector calls.
    """

    def __init__(self, profile: BaselineProfile, source_data: np.ndarray | None = None):
        self.profile = profile
        self.target_cov = profile.cov
        self._W: np.ndarray | None = None
        self._fallback = ZScoreAdapter(profile)

        if source_data is not None and len(source_data) >= 2:
            self.fit(source_data)

    def fit(self, source_data: np.ndarray) -> "CoralAdapter":
        """
        Compute the alignment matrix from source session data.

        Parameters
        ----------
        source_data : np.ndarray, shape (n_samples, n_features)
        """
        if len(source_data) < 2:
            return self

        Cs = np.cov(source_data, rowvar=False, ddof=1)
        Cs_reg = Cs + 1e-6 * np.eye(Cs.shape[0])
        Ct = self.target_cov

        try:
            Cs_inv_sqrt = np.real(sqrtm(np.linalg.inv(Cs_reg)))
            Ct_sqrt     = np.real(sqrtm(Ct))
            self._W = Cs_inv_sqrt @ Ct_sqrt
        except Exception:
            self._W = None

        return self

    def transform(self, x: np.ndarray) -> np.ndarray:
        if self._W is None:
            return self._fallback.transform(x)
        try:
            return x @ self._W
        except Exception:
            return self._fallback.transform(x)
