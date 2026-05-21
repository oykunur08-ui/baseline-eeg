"""
config.py
Global configuration for Baseline.
All tunable parameters live here — no magic numbers in modules.
"""

from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
SAMPLE_DIR = DATA_DIR / "sample"
DB_PATH = BASE_DIR / "database" / "baseline.db"

# ── EEG Band Definitions (Hz) ──────────────────────────────────────────────
BANDS = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta":  (13.0, 30.0),
    "gamma": (30.0, 45.0),
}

# ── Feature Column Names ───────────────────────────────────────────────────
# These are the expected column names in CSV input files.
FEATURE_COLUMNS = [
    "alpha_T7", "alpha_T8",
    "beta_T7",  "beta_T8",
    "theta_T7", "theta_T8",
]

SESSION_COLUMN = "session"

# ── Baseline Engine ────────────────────────────────────────────────────────
# Minimum number of sessions required to compute a stable baseline
MIN_BASELINE_SESSIONS = 5

# Regularization added to diagonal of covariance matrix to prevent
# singular matrix errors (Tikhonov regularization)
COVARIANCE_REGULARIZATION = 1e-6

# ── Deviation Engine ───────────────────────────────────────────────────────
# Mahalanobis distance thresholds for deviation classification
DEVIATION_THRESHOLDS = {
    "stable":   (0.0, 1.5),
    "mild":     (1.5, 3.0),
    "moderate": (3.0, 5.0),
    "high":     (5.0, float("inf")),
}

# ── Synthetic Data ─────────────────────────────────────────────────────────
SYNTHETIC_N_SESSIONS = 30
SYNTHETIC_NOISE_SCALE = 0.15

# ── UI ─────────────────────────────────────────────────────────────────────
APP_TITLE = "Baseline"
APP_SUBTITLE = "Personal EEG Deviation Modeling"
APP_ICON = "🧠"
THEME_COLOR = "#4F8EF7"