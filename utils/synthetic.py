"""
utils/synthetic.py
Synthetic EEG feature data generator.

Produces realistic multi-subject datasets with:
  - Inter-subject variability in baseline distributions
  - Alpha suppression vs enhancement patterns
  - Realistic band power ranges and noise
  - Optional "cognitive state shift" epochs

Used when no real data is uploaded, enabling full demo functionality.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from config import FEATURE_COLUMNS, SESSION_COLUMN, SYNTHETIC_N_SESSIONS, SYNTHETIC_NOISE_SCALE


# Realistic EEG alpha power ranges (arbitrary units post-normalization)
SUBJECT_ARCHETYPES = {
    "subject_A": {
        # High alpha baseline, alpha enhancer under load
        "alpha_T7_base": 1.8, "alpha_T8_base": 2.1,
        "beta_T7_base":  0.6, "beta_T8_base":  0.7,
        "theta_T7_base": 0.9, "theta_T8_base": 0.8,
        "noise_scale":   0.12,
    },
    "subject_B": {
        # Low alpha baseline, alpha suppressor under load (common pattern)
        "alpha_T7_base": 0.7, "alpha_T8_base": 0.6,
        "beta_T7_base":  1.4, "beta_T8_base":  1.5,
        "theta_T7_base": 1.1, "theta_T8_base": 1.2,
        "noise_scale":   0.18,
    },
    "subject_C": {
        # Moderate, right-lateralized alpha
        "alpha_T7_base": 1.1, "alpha_T8_base": 1.6,
        "beta_T7_base":  1.0, "beta_T8_base":  0.9,
        "theta_T7_base": 0.8, "theta_T8_base": 0.7,
        "noise_scale":   0.10,
    },
}


def generate_subject_sessions(
    subject_name: str,
    n_sessions: int = SYNTHETIC_N_SESSIONS,
    noise_scale: float = SYNTHETIC_NOISE_SCALE,
    include_shift: bool = False,
    shift_start: int = 20,
    seed: int | None = None,
) -> pd.DataFrame:
    """
    Generate synthetic EEG feature sessions for one subject.

    Parameters:
        subject_name:  Must be a key in SUBJECT_ARCHETYPES (or uses defaults)
        n_sessions:    Number of rows to generate
        noise_scale:   Overall noise multiplier (overrides archetype if set)
        include_shift: If True, introduce a cognitive state shift after
                       shift_start sessions (simulates a real experimental condition)
        shift_start:   Session index where the shift begins
        seed:          Random seed for reproducibility

    Returns:
        DataFrame with SESSION_COLUMN + FEATURE_COLUMNS
    """
    rng = np.random.default_rng(seed)
    arch = SUBJECT_ARCHETYPES.get(subject_name, SUBJECT_ARCHETYPES["subject_C"])
    ns = noise_scale if noise_scale != SYNTHETIC_NOISE_SCALE else arch["noise_scale"]

    records = []
    for i in range(n_sessions):
        shift_factor = 1.0
        if include_shift and i >= shift_start:
            # Alpha suppression + beta increase as cognitive load rises
            shift_factor = 1.0 + 0.4 * ((i - shift_start) / max(n_sessions - shift_start, 1))

        row = {SESSION_COLUMN: i}
        for feat in FEATURE_COLUMNS:
            base_val = arch[f"{feat}_base"]
            # Apply shift: suppress alpha, boost beta/theta under load
            if "alpha" in feat:
                val = base_val / shift_factor
            elif "beta" in feat:
                val = base_val * shift_factor
            else:
                val = base_val * (1 + 0.2 * (shift_factor - 1))

            noise = rng.normal(0, ns * base_val)
            row[feat] = max(val + noise, 0.01)  # keep physically positive

        records.append(row)

    return pd.DataFrame(records)


def generate_all_subjects(
    n_sessions: int = SYNTHETIC_N_SESSIONS,
    include_shift: bool = False,
    seed: int = 42,
) -> dict[str, pd.DataFrame]:
    """
    Generate synthetic datasets for all predefined subjects.
    Subject C gets a cognitive state shift by default for demo purposes.
    """
    datasets: dict[str, pd.DataFrame] = {}
    for i, name in enumerate(SUBJECT_ARCHETYPES):
        shift = include_shift and (name == "subject_C")
        datasets[name] = generate_subject_sessions(
            name,
            n_sessions=n_sessions,
            include_shift=shift,
            shift_start=int(n_sessions * 0.6),
            seed=seed + i,
        )
    return datasets


def save_sample_csvs(output_dir: str = "data/sample") -> None:
    """
    Write sample CSV files for all subjects to disk.
    Called once during project setup.
    """
    import os
    os.makedirs(output_dir, exist_ok=True)
    datasets = generate_all_subjects(include_shift=True)
    for name, df in datasets.items():
        path = f"{output_dir}/{name}.csv"
        df.to_csv(path, index=False)
        print(f"Saved {path}")


if __name__ == "__main__":
    save_sample_csvs()