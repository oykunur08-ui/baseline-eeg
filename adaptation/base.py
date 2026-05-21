"""adaptation/base.py — Abstract adapter interface."""
from __future__ import annotations
from abc import ABC, abstractmethod
import numpy as np


class BaseAdapter(ABC):
    @abstractmethod
    def transform(self, x: np.ndarray) -> np.ndarray:
        """Align feature vector x to the baseline embedding space."""
        ...
