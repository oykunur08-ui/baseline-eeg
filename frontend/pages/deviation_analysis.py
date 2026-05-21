"""
frontend/pages/deviation_analysis.py
Neural Deviation Analysis — the hero page.
"""

import streamlit as st
import numpy as np
import pandas as pd
from scipy.linalg import inv

from database.db import (
    list_users, get_or_create_user, load_baseline,
    get_sessions_for_user, save_deviation, get_deviation_history,
)
from core.baseline_engine import BaselineProfile, compute_stability_index
from core.deviation_engine import compute_deviation, compute_deviation_series
from visualization.plots import (
    longitudinal_drift, deviation_heatmap,
    feature_contribution_bars, baseline_radar,
)
from frontend.components.charts import apply_chart_theme, deviation_gauge_chart
from frontend.components.cards import stat_card, section_header, callout, deviation_badge
from frontend.components.metrics import natural_language_summary
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
        "Neural Deviation Analysis",
        "Mahalanobis distance from personal baseline",
    )

    users = list_users()
    if not users:
        callout("No subjects found. Upload data or generate demo data from the Dashboard.", kind="info")
        return

    subject = st.selectbox("Select subject", users, label_visibility="collapsed")
    uid = get_or_create_user(subject)
    profile = _load_profile(uid, subject)

    if profile is None:
        callout(
            "No baseline found. Go to <b>Baseline Profile</b> and compute the baseline first.",
            kind="warning",
        )
        return

    session_df = get_sessions_for_user(uid)
    if session_df.empty:
        callout("No sessions found for this subject.", kind="warning")
        return

    feature_rows = pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)
    dev_series = compute_deviation_series(feature_rows, profile)

    # ── Top metrics ───────────────────────────────────────────────────────────
    mean_d = dev_series["mahal_distance"].mean()
    max_d  = dev_series["mahal_distance"].max()
    last_d = dev_series["mahal_distance"].iloc[-1]

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        stat_card(f"{mean_d:.2f}", "Mean D(x)", "∿", color="accent")
    with col2:
        stat_card(f"{max_d:.2f}", "Max D(x)", "↑", color="red")
    with col3:
        stat_card(f"{last_d:.2f}", "Latest D(x)", "⬡", color="amber")
    with col4:
        stat_card(f"{profile.stability_index:.3f}", "Stability", "◎", color="green")

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:2rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Session selector ──────────────────────────────────────────────────────
    section_header("Session Analysis", "Inspect a specific session in detail")
    session_idx = st.slider(
        "Session index", 0, len(feature_rows) - 1, len(feature_rows) - 1,
        label_visibility="visible",
    )

    x = feature_rows.iloc[session_idx][FEATURE_COLUMNS].values.astype(float)
    result = compute_deviation(x, profile)

    # ── Gauge + badge row ─────────────────────────────────────────────────────
    col_gauge, col_badge = st.columns([1, 2])
    with col_gauge:
        fig_gauge = deviation_gauge_chart(result.mahal_distance)
        st.plotly_chart(fig_gauge, use_container_width=True)
    with col_badge:
        st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)
        deviation_badge(result.deviation_label, result.mahal_distance)
        natural_language_summary(result.z_scores)

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:1.5rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Feature contribution + radar ──────────────────────────────────────────
    section_header("Feature Breakdown", "Which EEG bands drove this deviation")
    col_bars, col_radar = st.columns([3, 2])
    with col_bars:
        fig_bars = apply_chart_theme(feature_contribution_bars(result))
        st.plotly_chart(fig_bars, use_container_width=True)
    with col_radar:
        fig_radar = apply_chart_theme(baseline_radar(profile, new_vector=x))
        st.plotly_chart(fig_radar, use_container_width=True)

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:1.5rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Longitudinal drift ────────────────────────────────────────────────────
    section_header("Longitudinal Drift", "How deviation evolves across sessions")
    fig_drift = apply_chart_theme(longitudinal_drift(dev_series))
    st.plotly_chart(fig_drift, use_container_width=True)

    with st.expander("Feature z-score heatmap"):
        fig_heat = apply_chart_theme(deviation_heatmap(dev_series))
        st.plotly_chart(fig_heat, use_container_width=True)

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:1.5rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Save + history ────────────────────────────────────────────────────────
    if st.button("Save session to deviation history"):
        save_deviation(uid, result.mahal_distance, result.z_scores, result.deviation_label)
        callout("Saved to deviation history.", kind="success")

    history = get_deviation_history(uid)
    if not history.empty:
        with st.expander(f"Deviation history ({len(history)} records)"):
            st.dataframe(
                history[["computed_at", "mahal_distance", "deviation_label"]],
                use_container_width=True,
            )
