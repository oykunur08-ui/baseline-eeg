"""
frontend/pages/explainability.py
Insights & Explainability — transparent deviation decomposition.
"""

import streamlit as st
import pandas as pd
import numpy as np
from scipy.linalg import inv

from database.db import list_users, get_or_create_user, load_baseline, get_sessions_for_user
from core.baseline_engine import BaselineProfile, compute_stability_index
from core.deviation_engine import compute_deviation
from visualization.plots import feature_contribution_bars, feature_distribution_plot
from frontend.components.charts import apply_chart_theme
from frontend.components.cards import callout, section_header
from frontend.components.metrics import natural_language_summary, feature_rank_table
from frontend.theme import COLORS, page_header
from config import FEATURE_COLUMNS


def _load_profile(uid: int, name: str) -> BaselineProfile | None:
    bl = load_baseline(uid)
    if bl is None:
        return None
    return BaselineProfile(
        user_name=name,
        mean=bl["mean"],
        cov=bl["cov"],
        cov_inv=inv(bl["cov"]),
        n_sessions=bl["n_sessions"],
        feature_names=FEATURE_COLUMNS,
        stability_index=compute_stability_index(bl["cov"]),
    )


def render() -> None:
    c = COLORS
    page_header(
        "Insights & Explainability",
        "Transparent decomposition of neural deviation — no black box",
    )

    users = list_users()
    if not users:
        callout("No subjects found.", kind="info")
        return

    subject = st.selectbox("Select subject", users, label_visibility="collapsed")
    uid = get_or_create_user(subject)
    profile = _load_profile(uid, subject)

    if profile is None:
        callout("Build a baseline first in <b>Baseline Profile</b>.", kind="warning")
        return

    session_df = get_sessions_for_user(uid)
    if session_df.empty:
        callout("No sessions found.", kind="warning")
        return

    feature_rows = pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)

    session_idx = st.slider(
        "Session to explain",
        0, len(feature_rows) - 1, len(feature_rows) - 1,
    )
    x = feature_rows.iloc[session_idx][FEATURE_COLUMNS].values.astype(float)
    result = compute_deviation(x, profile)

    # ── Summary header ────────────────────────────────────────────────────────
    from frontend.components.cards import deviation_badge
    deviation_badge(result.deviation_label, result.mahal_distance)

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:1.5rem 0;"></div>',
                unsafe_allow_html=True)

    # ── What changed ─────────────────────────────────────────────────────────
    natural_language_summary(result.z_scores, threshold=0.8)

    # ── Contribution chart + rank table ──────────────────────────────────────
    section_header("Feature Contributions", "Ranked by absolute z-score")
    col_chart, col_table = st.columns([3, 2])
    with col_chart:
        fig = apply_chart_theme(feature_contribution_bars(result))
        st.plotly_chart(fig, use_container_width=True)
    with col_table:
        st.markdown("<div style='height:1.5rem;'></div>", unsafe_allow_html=True)
        feature_rank_table(result.feature_contributions, result.z_scores)

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:1.5rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Feature distribution ──────────────────────────────────────────────────
    section_header("Feature Distribution Context", "Session value vs baseline distribution")
    with st.expander("View feature distribution", expanded=True):
        feat_select = st.selectbox("Feature", FEATURE_COLUMNS, label_visibility="collapsed")
        fig2 = apply_chart_theme(feature_distribution_plot(feature_rows, profile, feat_select))
        st.plotly_chart(fig2, use_container_width=True)

    # ── Covariance matrix ─────────────────────────────────────────────────────
    with st.expander("Covariance matrix Σ"):
        st.caption(
            "The full regularized covariance matrix used for Mahalanobis computation."
        )
        cov_df = pd.DataFrame(
            profile.cov, index=FEATURE_COLUMNS, columns=FEATURE_COLUMNS
        ).round(5)
        st.dataframe(cov_df, use_container_width=True)
